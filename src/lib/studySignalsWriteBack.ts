/**
 * Map extracted study signals → UI surface hints (tasks filter, soft ack, dashboard).
 */

import type { Lang } from './i18n';
import type { DailyCheckInAnswers, SessionIntent } from './dailyLearningCheckIn';

export type TasksFilterPreset = 'review' | 'exam' | null;

export function tasksFilterFromSignals(
  answers: Partial<DailyCheckInAnswers>,
): TasksFilterPreset {
  if (answers.sessionIntent === 'review') return 'review';
  if (answers.sessionIntent === 'exam') return 'exam';
  return null;
}

/** Keep a short rolling insight string for Dashboard mirrors. */
export function buildChatConsistencyInsight(
  prev: string[] | undefined,
  answers: Partial<DailyCheckInAnswers>,
  lang: Lang,
): string[] {
  const bits: string[] = [];
  if (answers.energy) bits.push(lang === 'el' ? `ενέργεια:${answers.energy}` : `energy:${answers.energy}`);
  if (answers.availableMinutes) bits.push(`${answers.availableMinutes}′`);
  if (answers.sessionIntent) bits.push(intentLabel(lang, answers.sessionIntent));
  if (answers.focusCourseTitle && answers.focusCourseTitle !== 'suggested') {
    bits.push(answers.focusCourseTitle);
  }
  if (bits.length === 0) return prev ?? [];
  const line = lang === 'el'
    ? `Chat σήμερα: ${bits.join(' · ')}`
    : `Chat today: ${bits.join(' · ')}`;
  const next = [line, ...(prev ?? []).filter((s) => !s.startsWith('Chat σήμερα:') && !s.startsWith('Chat today:'))];
  return next.slice(0, 5);
}

export function silentCaptureAck(
  lang: Lang,
  /** Slot ids or answer keys — length gate only; copy is built from `answers`. */
  filled: readonly string[],
  answers: Partial<DailyCheckInAnswers>,
): string | null {
  if (filled.length < 2) return null;
  const bits: string[] = [];
  if (answers.energy) bits.push(lang === 'el' ? `ενέργεια ${answers.energy}` : `energy ${answers.energy}`);
  if (answers.availableMinutes) {
    bits.push(lang === 'el' ? `${answers.availableMinutes}′` : `${answers.availableMinutes}′`);
  }
  if (answers.sessionIntent) {
    bits.push(intentLabel(lang, answers.sessionIntent));
  }
  if (answers.focusCourseTitle && answers.focusCourseTitle !== 'suggested') {
    bits.push(answers.focusCourseTitle);
  }
  if (bits.length < 2) return null;
  if (lang === 'el') {
    return `Το σημείωσα ήσυχα: ${bits.join(' · ')}. Συνεχίζουμε από εκεί.`;
  }
  return `Quietly noted: ${bits.join(' · ')}. We'll go from there.`;
}

function intentLabel(lang: Lang, intent: SessionIntent): string {
  if (lang === 'el') {
    const map: Record<SessionIntent, string> = {
      learn: 'νέο υλικό',
      review: 'επανάληψη',
      practice: 'εξάσκηση',
      exam: 'εξετάσεις',
      light: 'ελαφριά',
    };
    return map[intent];
  }
  return intent;
}
