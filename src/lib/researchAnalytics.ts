import type { ActivityItem, ConfidencePoint, Course, LearnerModel } from '../types';
import type { LearningEvent } from './learningEvents';
import { retentionCurveFromActivities } from './retentionAnalytics';

export type BktConceptParams = {
  concept: string;
  pLearned: number;
  attempts: number;
  correct: number;
};

export type ResearchMetrics = {
  brierScore: number | null;
  expectedCalibrationError: number | null;
  spacingDensity: number;
  interleavingRatio: number;
  bktConcepts: BktConceptParams[];
  forgettingCurve: { day: number; retention: number }[];
  sampleActivities: number;
  sampleEvents: number;
};

const PIPELINE_VERSION = '2.5.x';
const FSRS_VERSION = 'FSRS-4';

function computeBrierScore(points: ConfidencePoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => s + (p.predicted - p.actual) ** 2, 0);
  return sum / points.length;
}

/** Expected calibration error — mean |predicted − actual| across calibration points. */
function computeEce(points: ConfidencePoint[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((s, p) => s + Math.abs(p.predicted - p.actual), 0) / points.length;
}

function inferBktFromEvents(events: LearningEvent[]): BktConceptParams[] {
  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const e of events) {
    if (e.type !== 'quiz_attempted' || !e.concept) continue;
    const row = byConcept.get(e.concept) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (e.payload?.correct === true) row.correct += 1;
    byConcept.set(e.concept, row);
  }
  return [...byConcept.entries()]
    .map(([concept, { correct, total }]) => ({
      concept,
      pLearned: total > 0 ? correct / total : 0,
      attempts: total,
      correct,
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 12);
}

function bktFromActivities(activities: ActivityItem[]): BktConceptParams[] {
  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const act of activities) {
    if (act.type !== 'quiz_passed' && act.type !== 'quiz_failed') continue;
    const m = act.description.match(/(?:on|quiz on)\s+(.+?)(?:\s*\(|$)/i);
    const concept = m?.[1]?.trim();
    if (!concept) continue;
    const row = byConcept.get(concept) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (act.type === 'quiz_passed') row.correct += 1;
    byConcept.set(concept, row);
  }
  return [...byConcept.entries()]
    .map(([concept, { correct, total }]) => ({
      concept,
      pLearned: total > 0 ? correct / total : 0,
      attempts: total,
      correct,
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 12);
}

function spacingDensity(model: LearnerModel): number {
  if (model.spacingIntervals.length === 0) return 0;
  const avgInterval = model.spacingIntervals.reduce((s, sp) => s + sp.interval, 0)
    / model.spacingIntervals.length;
  return Math.min(1, avgInterval / 14);
}

function interleavingRatio(activities: ActivityItem[]): number {
  const concepts: string[] = [];
  for (const act of activities) {
    if (act.type !== 'quiz_passed' && act.type !== 'quiz_failed' && act.type !== 'review_done') continue;
    const m = act.description.match(/(?:on|Reviewed:|quiz on)\s+(.+?)(?:\s*\(|$)/i);
    if (m?.[1]) concepts.push(m[1].trim().toLowerCase());
  }
  if (concepts.length < 2) return 0;
  let switches = 0;
  for (let i = 1; i < concepts.length; i++) {
    if (concepts[i] !== concepts[i - 1]) switches += 1;
  }
  return switches / (concepts.length - 1);
}

export function computeResearchMetrics(
  model: LearnerModel,
  activities: ActivityItem[],
  events: LearningEvent[],
): ResearchMetrics {
  const fromEvents = inferBktFromEvents(events);
  const fromActs = bktFromActivities(activities);
  const bktConcepts = fromEvents.length > 0 ? fromEvents : fromActs;

  return {
    brierScore: computeBrierScore(model.confidenceCalibration),
    expectedCalibrationError: computeEce(model.confidenceCalibration),
    spacingDensity: spacingDensity(model),
    interleavingRatio: interleavingRatio(activities),
    bktConcepts,
    forgettingCurve: retentionCurveFromActivities(activities),
    sampleActivities: activities.length,
    sampleEvents: events.length,
  };
}

export type ResearchExportManifest = {
  exportedAt: string;
  pipelineVersion: string;
  fsrsVersion: string;
  learnerSnapshot: {
    overallMastery: number;
    retentionRate: number;
    transferAbility: number;
    helpSeekingRate: number;
    persistenceScore: number;
    bestTimeOfDay: string;
    cognitiveLoadPreference: string;
  };
  metrics: ResearchMetrics;
  activities: ActivityItem[];
  events: LearningEvent[];
  courses: { id: string; title: string; mastery: number }[];
};

export function buildResearchExport(
  model: LearnerModel,
  activities: ActivityItem[],
  events: LearningEvent[],
  courses: Course[],
): ResearchExportManifest {
  return {
    exportedAt: new Date().toISOString(),
    pipelineVersion: PIPELINE_VERSION,
    fsrsVersion: FSRS_VERSION,
    learnerSnapshot: {
      overallMastery: model.overallMastery,
      retentionRate: model.retentionRate,
      transferAbility: model.transferAbility,
      helpSeekingRate: model.helpSeekingRate,
      persistenceScore: model.persistenceScore,
      bestTimeOfDay: model.bestTimeOfDay,
      cognitiveLoadPreference: model.cognitiveLoadPreference,
    },
    metrics: computeResearchMetrics(model, activities, events),
    activities,
    events,
    courses: courses
      .filter((c) => c.status !== 'generating')
      .map((c) => ({ id: c.id, title: c.title, mastery: c.mastery })),
  };
}

export function downloadResearchExport(manifest: ResearchExportManifest, filename?: string): void {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `synapse-research-${manifest.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
