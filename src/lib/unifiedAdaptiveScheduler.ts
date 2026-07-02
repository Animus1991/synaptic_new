/**
 * Unified adaptive scheduler — FSRS due dates × beta mastery × exam pacing.
 * Merges dashboard next-action and workspace next-action into recommendDailyPlan().
 */

import type { DashboardStats, LearnerModel, SpacingData, Task } from '../types';
import type { Lang } from './i18n';
import { t } from './i18n';
import { betaMean, type BetaMastery } from './pedagogy';
import { studyPlanBlockLabel } from './tasksContent';
import { findPendingTask } from './taskFlows';
import type { WorkspaceLiveSync } from './workspaceStoreSpine';
import { workspaceLiveIsStale } from './workspaceStoreSpine';
import {
  recommendNextAction,
  type NextActionRecommendation,
} from './nextActionEngine';
import type { DashboardNextAction } from './dashboardNextAction';

export type ConceptScheduleReason = 'fsrs-due' | 'low-mastery' | 'exam-pacing' | 'weak-area';

export type ConceptScheduleItem = {
  concept: string;
  priority: number;
  mastery: number;
  fsrsDue: boolean;
  daysUntilReview: number;
  examBoost: number;
  reasons: ConceptScheduleReason[];
};

export type ExamPacingState = {
  active: boolean;
  daysToExam: number | null;
  /** 1 = normal; >1 compresses perceived urgency for weak/due items */
  compressionFactor: number;
};

export type StudyPlanBlock = {
  label: string;
  minutes: number;
  items: string[];
};

export type WorkspaceActionOpts = Parameters<typeof recommendNextAction>[0];

export type DailyPlanRecommendation = {
  conceptQueue: ConceptScheduleItem[];
  dashboardAction: DashboardNextAction | null;
  workspaceAction: NextActionRecommendation | null;
  studyPlanBlocks: StudyPlanBlock[];
  examPacing: ExamPacingState;
};

const MS_PER_DAY = 86_400_000;

function normConcept(s: string): string {
  return s.trim().toLowerCase();
}

function conceptsMatch(a: string, b: string): boolean {
  const na = normConcept(a);
  const nb = normConcept(b);
  if (na === nb) return true;
  const prefix = na.slice(0, 6);
  return prefix.length >= 4 && (na.includes(nb) || nb.includes(na) || nb.includes(prefix));
}

function daysUntilReview(spacing: SpacingData | undefined, now: Date): number {
  if (!spacing?.nextReview) return 999;
  const due = new Date(spacing.nextReview).getTime();
  return Math.floor((due - now.getTime()) / MS_PER_DAY);
}

export function examPacingState(daysToExam: number | null): ExamPacingState {
  if (daysToExam === null || daysToExam > 14) {
    return { active: false, daysToExam, compressionFactor: 1 };
  }
  const compressionFactor = daysToExam <= 3 ? 2.2 : daysToExam <= 7 ? 1.7 : 1.35;
  return { active: true, daysToExam, compressionFactor };
}

/** Joint FSRS × mastery × exam priority for one concept (0–100). */
export function scoreConceptPriority(opts: {
  concept: string;
  spacing?: SpacingData;
  beta?: BetaMastery;
  weakMastery?: number;
  now?: Date;
  examPacing?: ExamPacingState;
}): ConceptScheduleItem {
  const now = opts.now ?? new Date();
  const pacing = opts.examPacing ?? examPacingState(null);
  const reasons: ConceptScheduleReason[] = [];

  const masteryFromBeta = opts.beta
    ? Math.round(betaMean(opts.beta.alpha, opts.beta.beta) * 100)
    : undefined;
  const mastery = opts.weakMastery ?? masteryFromBeta ?? 50;
  const importance = opts.beta?.importance ?? 1;

  const days = daysUntilReview(opts.spacing, now);
  const fsrsDue = days <= 0;
  let fsrsScore = 0;
  if (fsrsDue) {
    fsrsScore = 38 + Math.min(12, Math.abs(days) * 2);
    reasons.push('fsrs-due');
  } else if (days <= 1) {
    fsrsScore = 28;
    reasons.push('fsrs-due');
  } else {
    fsrsScore = Math.max(0, 18 - days);
  }

  let masteryScore = 0;
  if (mastery < 40) {
    masteryScore = (100 - mastery) * 0.42 * importance;
    reasons.push('low-mastery');
  } else if (mastery < 60) {
    masteryScore = (100 - mastery) * 0.32 * importance;
    reasons.push('weak-area');
  } else {
    masteryScore = Math.max(0, (70 - mastery) * 0.15);
  }

  let examBoost = 0;
  if (pacing.active && mastery < 75) {
    const days = pacing.daysToExam ?? 14;
    examBoost = ((14 - days) / 14) * (100 - mastery) * 0.35 * pacing.compressionFactor;
    reasons.push('exam-pacing');
  }

  const priority = Math.min(100, Math.round(fsrsScore + masteryScore + examBoost));

  return {
    concept: opts.concept,
    priority,
    mastery,
    fsrsDue,
    daysUntilReview: days,
    examBoost: Math.round(examBoost),
    reasons: [...new Set(reasons)],
  };
}

function findSpacingForConcept(
  concept: string,
  intervals: SpacingData[],
): SpacingData | undefined {
  return intervals.find((s) => conceptsMatch(s.concept, concept));
}

function findBetaForConcept(
  concept: string,
  betaMastery: BetaMastery[],
): BetaMastery | undefined {
  return betaMastery.find((b) => conceptsMatch(b.concept, concept));
}

/** Rank all known concepts by unified adaptive priority. */
export function buildConceptQueue(opts: {
  learnerModel: LearnerModel;
  betaMastery: BetaMastery[];
  daysToExam?: number | null;
  now?: Date;
}): ConceptScheduleItem[] {
  const now = opts.now ?? new Date();
  const pacing = examPacingState(opts.daysToExam ?? null);
  const seen = new Set<string>();
  const items: ConceptScheduleItem[] = [];

  const add = (concept: string, weakMastery?: number) => {
    const key = normConcept(concept);
    if (!concept || seen.has(key)) return;
    seen.add(key);
    items.push(
      scoreConceptPriority({
        concept,
        spacing: findSpacingForConcept(concept, opts.learnerModel.spacingIntervals),
        beta: findBetaForConcept(concept, opts.betaMastery),
        weakMastery,
        now,
        examPacing: pacing,
      }),
    );
  };

  for (const s of opts.learnerModel.spacingIntervals) add(s.concept);
  for (const w of opts.learnerModel.weakAreas) add(w.concept, w.mastery);
  for (const b of opts.betaMastery) add(b.concept);

  return items.sort((a, b) => b.priority - a.priority || a.mastery - b.mastery);
}

function examCountdownReason(lang: Lang, daysToExam: number): string {
  if (daysToExam === 0) return t('dashboardActionExamToday', lang);
  if (daysToExam === 1) return t('dashboardActionDaysUntilExamOne', lang);
  return t('dashboardActionDaysUntilExam', lang).replace('{days}', String(daysToExam));
}

function topWeakFromQueue(queue: ConceptScheduleItem[]): ConceptScheduleItem | undefined {
  return queue.find((c) => c.mastery < 60);
}

function taskPriorityScore(task: Task, queue: ConceptScheduleItem[]): number {
  const base: Record<Task['priority'], number> = {
    critical: 100,
    high: 80,
    medium: 50,
    low: 25,
  };
  let score = base[task.priority];
  if (task.isSpacedRepetition) score += 15;
  if (task.category === 'fix') score += 20;
  if (task.category === 'exam') score += 10;

  const match = queue.find(
    (c) =>
      conceptsMatch(c.concept, task.title)
      || task.tags.some((tag) => conceptsMatch(c.concept, tag)),
  );
  if (match) score += match.priority * 0.45;
  return score;
}

function sortTasksByScheduler(tasks: Task[], queue: ConceptScheduleItem[]): Task[] {
  return [...tasks].sort((a, b) => taskPriorityScore(b, queue) - taskPriorityScore(a, queue));
}

export function buildAdaptiveStudyPlanBlocks(
  tasks: Task[],
  lang: Lang,
  queue: ConceptScheduleItem[],
): StudyPlanBlock[] {
  const pending = sortTasksByScheduler(
    tasks.filter((t) => t.status === 'pending'),
    queue,
  );
  // Each task appears in at most one block (no repeat between mistakes/reviews/weak).
  const used = new Set<string>();
  const take = (predicate: (t: Task) => boolean, limit: number): Task[] => {
    const picked = pending.filter((t) => !used.has(t.id) && predicate(t)).slice(0, limit);
    for (const t of picked) used.add(t.id);
    return picked;
  };
  const mistakes = take((t) => t.category === 'fix', 2);
  const reviews = take((t) => t.isSpacedRepetition, 3);
  const weak = take((t) => t.category === 'learn' || t.priority === 'high', 2);
  const blocks: StudyPlanBlock[] = [];
  if (mistakes.length) {
    blocks.push({
      label: studyPlanBlockLabel('mistakes', lang),
      minutes: mistakes.reduce((s, t) => s + t.estimatedMinutes, 0),
      items: mistakes.map((t) => t.title),
    });
  }
  if (reviews.length) {
    blocks.push({
      label: studyPlanBlockLabel('reviews', lang),
      minutes: reviews.reduce((s, t) => s + t.estimatedMinutes, 0),
      items: reviews.map((t) => t.title),
    });
  }
  if (weak.length) {
    blocks.push({
      label: studyPlanBlockLabel('weak', lang),
      minutes: weak.reduce((s, t) => s + t.estimatedMinutes, 0),
      items: weak.map((t) => t.title),
    });
  }
  return blocks;
}

function selectDashboardAction(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  tasks: Task[];
  stats: DashboardStats;
  daysToExam: number | null;
  conceptQueue: ConceptScheduleItem[];
}): DashboardNextAction | null {
  const { lang, learnerModel, tasks, stats, daysToExam, conceptQueue } = opts;

  if (daysToExam !== null && daysToExam <= 14) {
    const examTask = findPendingTask(tasks, (t) => t.type === 'exam-prep');
    return {
      kind: 'exam-prep',
      label: t('dashboardActionExamPrep', lang),
      reason: examCountdownReason(lang, daysToExam),
      taskId: examTask?.id,
    };
  }

  const critical = tasks.find(
    (task) => task.status === 'pending' && (task.priority === 'critical' || task.priority === 'high'),
  );
  if (critical) {
    return {
      kind: 'critical-task',
      label: t('dashboardActionStartPriority', lang),
      reason: t('dashboardActionPending', lang).replace('{title}', critical.title),
      taskId: critical.id,
    };
  }

  if (stats.reviewsDue > 0) {
    return {
      kind: 'review-due',
      label: t('dashboardActionReviewsDue', lang),
      reason: t('dashboardActionReviewsDueToday', lang).replace('{count}', String(stats.reviewsDue)),
    };
  }

  const queueWeak = topWeakFromQueue(conceptQueue);
  const skillWeak = [...learnerModel.weakAreas].sort((a, b) => a.mastery - b.mastery)[0];
  const weakConcept = queueWeak?.concept ?? skillWeak?.concept;
  const weakMastery = queueWeak?.mastery ?? skillWeak?.mastery;
  if (weakConcept != null && weakMastery != null && weakMastery < 60) {
    return {
      kind: 'weak-area',
      label: t('dashboardActionFocusWeak', lang),
      reason: t('dashboardActionWeakMastery', lang)
        .replace('{concept}', weakConcept)
        .replace('{mastery}', String(weakMastery)),
      concept: weakConcept,
    };
  }

  const openMisconception = learnerModel.misconceptions.find((m) => !m.corrected);
  if (openMisconception) {
    return {
      kind: 'weak-area',
      label: t('dashboardActionFixMisconception', lang),
      reason: openMisconception.description,
      concept: openMisconception.concept,
    };
  }

  if (learnerModel.totalSessions === 0) {
    return {
      kind: 'start-session',
      label: t('dashboardActionStartSession', lang),
      reason: t('dashboardActionStartSessionReason', lang),
    };
  }

  return null;
}

/** Unified daily plan: concept queue, dashboard + workspace actions, adaptive study blocks. */
export function recommendDailyPlan(opts: {
  lang: Lang;
  learnerModel: LearnerModel;
  betaMastery: BetaMastery[];
  tasks: Task[];
  stats: DashboardStats;
  daysToExam?: number | null;
  workspaceLive?: WorkspaceLiveSync | null;
  workspace?: WorkspaceActionOpts | null;
  /** When set, study plan blocks only use tasks from this course (falls back to all courses if it has none). */
  activeCourseId?: string | null;
  now?: Date;
}): DailyPlanRecommendation {
  const {
    lang,
    learnerModel,
    betaMastery,
    tasks,
    stats,
    daysToExam = null,
    workspaceLive = null,
    workspace = null,
    activeCourseId = null,
    now,
  } = opts;

  const examPacing = examPacingState(daysToExam);
  const conceptQueue = buildConceptQueue({
    learnerModel,
    betaMastery,
    daysToExam,
    now,
  });

  const workspaceFresh =
    workspaceLive && !workspaceLiveIsStale(workspaceLive) && workspaceLive.nextAction;

  const workspaceAction = workspace ? recommendNextAction(workspace) : null;

  let dashboardAction: DashboardNextAction | null = null;
  if (!workspaceFresh) {
    dashboardAction = selectDashboardAction({
      lang,
      learnerModel,
      tasks,
      stats,
      daysToExam,
      conceptQueue,
    });
  }

  const courseTasks = activeCourseId
    ? tasks.filter((t) => t.courseId === activeCourseId)
    : tasks;
  const studyPlanBlocks = buildAdaptiveStudyPlanBlocks(
    courseTasks.some((t) => t.status === 'pending') ? courseTasks : tasks,
    lang,
    conceptQueue,
  );

  return {
    conceptQueue,
    dashboardAction,
    workspaceAction,
    studyPlanBlocks,
    examPacing,
  };
}
