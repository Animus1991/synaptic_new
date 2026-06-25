import type { WorkspaceStep } from './workspaceStepTools';
import { loadJson, saveJson } from './persistence';

export type StepScheduleEntry = {
  lastVisitedAt: string;
  visitCount: number;
  intervalDays: number;
  easeFactor: number;
  nextDueAt: string;
};

const SCHEDULE_KEY = 'workspace-step-schedule';

function isQuizStep(step: WorkspaceStep): boolean {
  return /quiz|κουίζ|έλεγχος|knowledge check/i.test(`${step.type} ${step.title}`);
}

export function loadStepSchedule(scopeKey: string): Record<number, StepScheduleEntry> {
  const all = loadAllStepSchedules();
  return all[scopeKey] ?? {};
}

export function loadAllStepSchedules(): Record<string, Record<number, StepScheduleEntry>> {
  return loadJson<Record<string, Record<number, StepScheduleEntry>>>(SCHEDULE_KEY, {});
}

export function replaceAllStepSchedules(
  map: Record<string, Record<number, StepScheduleEntry>> | null | undefined,
): void {
  saveJson(SCHEDULE_KEY, map ?? {});
}

export function saveStepSchedule(scopeKey: string, schedule: Record<number, StepScheduleEntry>): void {
  const all = loadAllStepSchedules();
  all[scopeKey] = schedule;
  saveJson(SCHEDULE_KEY, all);
}

function defaultEntry(now: Date): StepScheduleEntry {
  return {
    lastVisitedAt: now.toISOString(),
    visitCount: 0,
    intervalDays: 1,
    easeFactor: 2.3,
    nextDueAt: now.toISOString(),
  };
}

export function isStepDue(entry: StepScheduleEntry, now = new Date()): boolean {
  return new Date(entry.nextDueAt).getTime() <= now.getTime();
}

/**
 * Record a step visit after the learner advances. Shorter intervals when mastery is low.
 */
export function recordStepVisit(
  scopeKey: string,
  stepIndex: number,
  conceptMastery: number,
): StepScheduleEntry {
  const schedule = loadStepSchedule(scopeKey);
  const now = new Date();
  const prev = schedule[stepIndex] ?? defaultEntry(now);
  const quality = conceptMastery >= 70 ? 'strong' : conceptMastery >= 45 ? 'moderate' : 'weak';

  let intervalDays = prev.intervalDays;
  let easeFactor = prev.easeFactor;
  if (quality === 'strong') {
    intervalDays = Math.min(30, Math.max(1, intervalDays * easeFactor));
    easeFactor = Math.min(3.0, easeFactor + 0.05);
  } else if (quality === 'moderate') {
    intervalDays = Math.min(14, Math.max(1, intervalDays * 1.4));
  } else {
    intervalDays = 1;
    easeFactor = Math.max(1.8, easeFactor - 0.1);
  }

  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + Math.round(intervalDays));

  const entry: StepScheduleEntry = {
    lastVisitedAt: now.toISOString(),
    visitCount: prev.visitCount + 1,
    intervalDays,
    easeFactor,
    nextDueAt: nextDue.toISOString(),
  };
  schedule[stepIndex] = entry;
  saveStepSchedule(scopeKey, schedule);
  return entry;
}

export function dueStepIndices(
  steps: WorkspaceStep[],
  schedule: Record<number, StepScheduleEntry>,
  now = new Date(),
): number[] {
  const due: number[] = [];
  steps.forEach((step, i) => {
    if (isQuizStep(step)) return;
    const entry = schedule[i];
    if (!entry || isStepDue(entry, now)) due.push(i);
  });
  return due;
}

/**
 * Boost due steps toward the front (quiz always last). Composes with mastery ordering.
 */
export function applySpacedStepBoost(
  steps: WorkspaceStep[],
  schedule: Record<number, StepScheduleEntry>,
  now = new Date(),
): { steps: WorkspaceStep[]; dueIndices: number[] } {
  if (steps.length <= 2) return { steps, dueIndices: [] };

  const quiz = steps.filter(isQuizStep);
  const learnPairs = steps.map((s, i) => ({ step: s, origIndex: i })).filter(({ step }) => !isQuizStep(step));
  const dueSet = new Set(dueStepIndices(steps, schedule, now));

  const ranked = learnPairs
    .sort((a, b) => {
      const aDue = dueSet.has(a.origIndex);
      const bDue = dueSet.has(b.origIndex);
      if (aDue !== bDue) return aDue ? -1 : 1;
      return a.origIndex - b.origIndex;
    })
    .map(({ step }) => step);

  const final = [...ranked, ...quiz];
  const dueKeys = new Set(
    [...dueSet].map((i) => `${steps[i]?.type}::${steps[i]?.title}`),
  );
  const dueIndices = final
    .map((s, i) => (dueKeys.has(`${s.type}::${s.title}`) && !isQuizStep(s) ? i : -1))
    .filter((i) => i >= 0);

  return { steps: final, dueIndices };
}

export function formatStepDueLabel(entry: StepScheduleEntry, lang: 'en' | 'el', now = new Date()): string {
  const due = new Date(entry.nextDueAt);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return lang === 'el' ? 'Επανάληψη' : 'Review';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (days === 1) return lang === 'el' ? 'Αύριο' : 'Tomorrow';
  return lang === 'el' ? `${days}ημ` : `${days}d`;
}
