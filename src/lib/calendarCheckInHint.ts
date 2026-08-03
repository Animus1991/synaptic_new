/**
 * Soft calendar hints from chat check-in (duration + intent + focus).
 * Never mutates Google auth / upsert contract — only shapes payload windows.
 */

import type { Task } from '../types';
import type { Lang } from './i18n';
import {
  loadDailyCheckIn,
  type DailyCheckInAnswers,
  type SessionIntent,
} from './dailyLearningCheckIn';

export type CalendarCheckInHint = {
  durationMinutes: number | null;
  focusCourseId?: string;
  focusCourseTitle?: string;
  sessionIntent?: SessionIntent;
  /** Human label for Settings / Google panel. */
  summary: string;
  hasSignals: boolean;
};

/** Next quarter-hour local start (soft slot when task has no schedule). */
export function softCalendarStartIso(now = new Date()): string {
  const d = new Date(now);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const add = mins % 15 === 0 ? 15 : 15 - (mins % 15);
  d.setMinutes(mins + add);
  return d.toISOString();
}

export function calendarDurationFromCheckIn(
  answers: Partial<DailyCheckInAnswers>,
  taskEstimatedMinutes?: number,
): number {
  if (typeof answers.availableMinutes === 'number' && answers.availableMinutes >= 5) {
    return Math.min(180, Math.max(15, Math.round(answers.availableMinutes)));
  }
  if (answers.sessionIntent === 'light' || answers.energy === 'low') return 15;
  if (answers.sessionIntent === 'exam') return Math.max(25, taskEstimatedMinutes || 50);
  return Math.max(15, taskEstimatedMinutes || 25);
}

function intentScore(task: Task, intent?: SessionIntent): number {
  if (!intent) return 0;
  if (intent === 'review' && (task.category === 'review' || task.isSpacedRepetition)) return 5;
  if (intent === 'exam' && (task.category === 'exam' || task.type === 'exam-prep')) return 5;
  if (intent === 'practice' && (task.category === 'practice' || task.type === 'practice' || task.type === 'quiz')) return 4;
  if (intent === 'learn' && (task.category === 'learn' || task.type === 'lesson')) return 4;
  if (intent === 'light' && (task.isSpacedRepetition || task.type === 'flashcards')) return 5;
  return 0;
}

/** Rank pending tasks for “sync today’s chat plan”. */
export function rankTasksForCalendarHint(
  tasks: Task[],
  answers: Partial<DailyCheckInAnswers>,
): Task[] {
  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in-progress');
  return [...pending].sort((a, b) => {
    let sa = intentScore(a, answers.sessionIntent);
    let sb = intentScore(b, answers.sessionIntent);
    if (answers.focusCourseId) {
      if (a.courseId === answers.focusCourseId) sa += 3;
      if (b.courseId === answers.focusCourseId) sb += 3;
    }
    if (a.scheduledFor || a.dueAt) sa += 1;
    if (b.scheduledFor || b.dueAt) sb += 1;
    if (a.priority === 'critical') sa += 1;
    if (b.priority === 'critical') sb += 1;
    return sb - sa;
  });
}

export function buildCalendarCheckInHint(
  lang: Lang,
  answers: Partial<DailyCheckInAnswers> = loadDailyCheckIn().answers,
): CalendarCheckInHint {
  const durationMinutes =
    typeof answers.availableMinutes === 'number' || answers.sessionIntent || answers.energy
      ? calendarDurationFromCheckIn(answers)
      : null;
  const hasSignals = Boolean(
    durationMinutes != null
    || answers.sessionIntent
    || answers.focusCourseId
    || (answers.focusCourseTitle && answers.focusCourseTitle !== 'suggested'),
  );
  const bits: string[] = [];
  if (durationMinutes != null) bits.push(`${durationMinutes}′`);
  if (answers.sessionIntent) {
    bits.push(lang === 'el' ? intentEl(answers.sessionIntent) : answers.sessionIntent);
  }
  if (answers.focusCourseTitle && answers.focusCourseTitle !== 'suggested') {
    bits.push(answers.focusCourseTitle);
  }
  const summary = !hasSignals
    ? (lang === 'el'
      ? 'Δεν υπάρχει ακόμα chat plan για σήμερα — το sync χρησιμοποιεί τα προγραμματισμένα tasks.'
      : 'No chat plan for today yet — sync uses scheduled tasks as usual.')
    : lang === 'el'
      ? `Chat plan σήμερα: ${bits.join(' · ')}. Το sync θα χρησιμοποιήσει αυτή τη διάρκεια όπου ταιριάζει.`
      : `Today’s chat plan: ${bits.join(' · ')}. Sync will use this duration where it fits.`;

  return {
    durationMinutes,
    focusCourseId: answers.focusCourseId,
    focusCourseTitle: answers.focusCourseTitle,
    sessionIntent: answers.sessionIntent,
    summary,
    hasSignals,
  };
}

function intentEl(intent: SessionIntent): string {
  const map: Record<SessionIntent, string> = {
    learn: 'νέο υλικό',
    review: 'επανάληψη',
    practice: 'εξάσκηση',
    exam: 'εξετάσεις',
    light: 'ελαφριά',
  };
  return map[intent];
}
