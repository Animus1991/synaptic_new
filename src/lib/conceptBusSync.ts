/**
 * Backend session sync + dashboard/spaced-repetition integration for the
 * workspace concept bus.
 *
 * Concept buses and step schedules live in local persistence keys but travel
 * through `GET/PUT /v1/session` alongside learnerModel so authenticated
 * learners keep cross-tool engagement when switching devices.
 */

import type { BetaMastery } from './pedagogy';
import { betaMean } from './pedagogy';
import { conceptRelevanceScore } from './noteContentExtractors';
import type { LearnerModel, SkillNode } from '../types';
import { normalizeFocusTerm } from './workspaceFocus';
import {
  conceptEngagement,
  isConfident,
  isStruggling,
  type ConceptActivity,
  type ConceptBusState,
} from './workspaceConceptBus';
import type { StepScheduleEntry } from './spacedStepSchedule';
import { isStepDue } from './spacedStepSchedule';

export type ConceptBusMap = Record<string, ConceptBusState>;
export type StepScheduleMap = Record<string, Record<number, StepScheduleEntry>>;

export type ConceptBusInsight = {
  concept: string;
  key: string;
  mastery: number;
  engagement: number;
  struggling: boolean;
  confident: boolean;
  tools: ConceptActivity['tools'];
  struggleScore: number;
  lastAt: number;
  scopeKey?: string;
};

const MAX_SIGNALS = 40;

export function mergeConceptActivity(a: ConceptActivity, b: ConceptActivity): ConceptActivity {
  const newer = a.lastAt >= b.lastAt ? a : b;
  const older = a.lastAt >= b.lastAt ? b : a;
  const tools = [...older.tools];
  for (const t of newer.tools) {
    if (!tools.includes(t)) tools.push(t);
  }
  const toolHitCounts: ConceptActivity['toolHitCounts'] = { ...(older.toolHitCounts ?? {}) };
  for (const [tool, count] of Object.entries(newer.toolHitCounts ?? {})) {
    const key = tool as ConceptActivity['tools'][number];
    toolHitCounts[key] = (toolHitCounts[key] ?? 0) + count;
  }
  return {
    concept: newer.concept,
    key: newer.key,
    tools,
    signals: [...older.signals, ...newer.signals].slice(-MAX_SIGNALS),
    firstAt: Math.min(a.firstAt, b.firstAt),
    lastAt: Math.max(a.lastAt, b.lastAt),
    lastTool: newer.lastTool,
    struggleScore: a.struggleScore + b.struggleScore,
    toolHitCounts,
  };
}

export function mergeConceptBusState(local: ConceptBusState, remote: ConceptBusState): ConceptBusState {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: ConceptBusState = {};
  for (const key of keys) {
    const l = local[key];
    const r = remote[key];
    if (l && r) merged[key] = mergeConceptActivity(l, r);
    else merged[key] = (r ?? l)!;
  }
  return merged;
}

/** Merge scoped concept buses — union of scope keys, per-concept merge inside each scope. */
export function mergeAllConceptBuses(local: ConceptBusMap, remote: ConceptBusMap): ConceptBusMap {
  const scopes = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: ConceptBusMap = {};
  for (const scope of scopes) {
    const l = local[scope] ?? {};
    const r = remote[scope] ?? {};
    out[scope] = mergeConceptBusState(l, r);
  }
  return out;
}

export function mergeStepScheduleEntry(a: StepScheduleEntry, b: StepScheduleEntry): StepScheduleEntry {
  const aVisited = new Date(a.lastVisitedAt).getTime();
  const bVisited = new Date(b.lastVisitedAt).getTime();
  const newer = aVisited >= bVisited ? a : b;
  const dueA = new Date(a.nextDueAt).getTime();
  const dueB = new Date(b.nextDueAt).getTime();
  return {
    lastVisitedAt: newer.lastVisitedAt,
    visitCount: Math.max(a.visitCount, b.visitCount),
    intervalDays: Math.max(a.intervalDays, b.intervalDays),
    easeFactor: Math.max(a.easeFactor, b.easeFactor),
    nextDueAt: dueA <= dueB ? a.nextDueAt : b.nextDueAt,
  };
}

export function mergeAllStepSchedules(local: StepScheduleMap, remote: StepScheduleMap): StepScheduleMap {
  const scopes = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: StepScheduleMap = {};
  for (const scope of scopes) {
    const l = local[scope] ?? {};
    const r = remote[scope] ?? {};
    const indices = new Set([...Object.keys(l), ...Object.keys(r)].map(Number));
    const merged: Record<number, StepScheduleEntry> = {};
    for (const i of indices) {
      const le = l[i];
      const re = r[i];
      if (le && re) merged[i] = mergeStepScheduleEntry(le, re);
      else merged[i] = (re ?? le)!;
    }
    out[scope] = merged;
  }
  return out;
}

export function collectConceptBusInsights(
  buses: ConceptBusMap,
  masteryLookup: (concept: string) => number,
): ConceptBusInsight[] {
  const byKey = new Map<string, ConceptBusInsight>();
  for (const [scopeKey, bus] of Object.entries(buses)) {
    for (const activity of Object.values(bus)) {
      const insight: ConceptBusInsight = {
        concept: activity.concept,
        key: activity.key,
        mastery: masteryLookup(activity.concept),
        engagement: conceptEngagement(activity),
        struggling: isStruggling(activity),
        confident: isConfident(activity),
        tools: activity.tools,
        struggleScore: activity.struggleScore,
        lastAt: activity.lastAt,
        scopeKey,
      };
      const prev = byKey.get(activity.key);
      if (!prev || activity.lastAt > prev.lastAt) byKey.set(activity.key, insight);
    }
  }
  return [...byKey.values()].sort((a, b) => b.lastAt - a.lastAt);
}

export function countSpacedStepReviewsDue(
  schedules: StepScheduleMap,
  now = new Date(),
): number {
  let count = 0;
  for (const schedule of Object.values(schedules)) {
    for (const entry of Object.values(schedule)) {
      if (isStepDue(entry, now)) count++;
    }
  }
  return count;
}

function skillFromInsight(insight: ConceptBusInsight): SkillNode {
  return {
    concept: insight.concept,
    courseId: '',
    mastery: Math.max(12, Math.min(55, Math.round((1 - insight.engagement) * 45 + insight.struggleScore * 8))),
    lastPracticed: new Date(insight.lastAt).toISOString(),
    retentionPrediction: Math.max(0.2, 0.7 - insight.engagement * 0.4),
    practiceCount: insight.tools.length,
    averageResponseTime: 0,
    errorRate: Math.min(1, insight.struggleScore / 4),
  };
}

/**
 * Augment learnerModel weakAreas + spacingIntervals from observed cross-tool
 * struggle signals (honest — only concepts with real bus activity).
 */
export function enrichLearnerModelFromConceptBus(
  model: LearnerModel,
  buses: ConceptBusMap,
  betaMastery: BetaMastery[] = [],
): LearnerModel {
  const insights = collectConceptBusInsights(buses, (concept) => {
    const beta = betaMastery.find((b) => conceptRelevanceScore(b.concept, concept) > 0.45);
    if (beta) return Math.round(betaMean(beta.alpha, beta.beta) * 100);
    const existing = [...model.weakAreas, ...model.almostKnown, ...model.strongAreas]
      .find((s) => conceptRelevanceScore(s.concept, concept) > 0.45);
    return existing?.mastery ?? 38;
  });

  const struggling = insights.filter((i) => i.struggling);
  if (struggling.length === 0) return model;

  const weakByKey = new Map(model.weakAreas.map((w) => [normalizeFocusTerm(w.concept), w]));
  for (const s of struggling) {
    const key = normalizeFocusTerm(s.concept);
    if (!weakByKey.has(key)) weakByKey.set(key, skillFromInsight(s));
  }

  const spacingKeys = new Set(model.spacingIntervals.map((s) => normalizeFocusTerm(s.concept)));
  const nextSpacing = [...model.spacingIntervals];
  const now = new Date().toISOString();
  for (const s of struggling.slice(0, 6)) {
    const key = normalizeFocusTerm(s.concept);
    if (spacingKeys.has(key)) continue;
    nextSpacing.push({
      concept: s.concept,
      interval: 1,
      nextReview: now,
      stability: 1.4,
      difficulty: 0.65 + Math.min(0.3, s.struggleScore * 0.1),
      reviewCount: 0,
    });
    spacingKeys.add(key);
  }

  const busInsights = struggling.slice(0, 3).map(
    (s) => `Cross-tool review: ${s.concept} (${s.tools.slice(0, 3).join(' · ')})`,
  );

  return {
    ...model,
    weakAreas: [...weakByKey.values()].sort((a, b) => a.mastery - b.mastery).slice(0, 12),
    spacingIntervals: nextSpacing,
    interactionInsights: [...model.interactionInsights, ...busInsights].slice(-10),
  };
}

export function mergeDashboardReviewsDue(
  taskReviewsDue: number,
  stepSchedules: StepScheduleMap,
): number {
  return Math.max(taskReviewsDue, countSpacedStepReviewsDue(stepSchedules));
}
