/**
 * Daily reminders for incomplete learning check-in slots.
 * Surfaced in the notifications inbox and as soft Agent draft prompts.
 */

import type { Lang } from './i18n';
import type { ProactiveAgentAlert } from './proactiveAgentAlerts';
import {
  isCheckInComplete,
  loadDailyCheckIn,
  missingRequiredSlots,
  type CheckInSlotId,
  type DailyCheckInRecord,
} from './dailyLearningCheckIn';
import { loadJson, saveJson } from './persistence';

const REMINDER_LOG_KEY = 'daily-checkin-reminders-v1';

type ReminderLog = {
  /** dateKey → last reminder ISO */
  byDate: Record<string, string>;
};

function slotLabel(slot: CheckInSlotId, lang: Lang): string {
  const mapEl: Record<CheckInSlotId, string> = {
    openFeel: 'πώς νιώθεις',
    energy: 'ενέργεια μελέτης',
    availableMinutes: 'διαθέσιμος χρόνος',
    sessionIntent: 'είδος συνεδρίας',
    focusCourse: 'μάθημα εστίασης',
    confidence: 'αυτοπεποίθηση',
    blocker: 'εμπόδια',
    studiedToday: 'μελέτη σήμερα',
  };
  const mapEn: Record<CheckInSlotId, string> = {
    openFeel: 'how you feel',
    energy: 'study energy',
    availableMinutes: 'available time',
    sessionIntent: 'session type',
    focusCourse: 'focus course',
    confidence: 'confidence',
    blocker: 'blockers',
    studiedToday: 'studied today',
  };
  return lang === 'el' ? mapEl[slot] : mapEn[slot];
}

export function buildDailyCheckInAlert(
  lang: Lang,
  record: DailyCheckInRecord = loadDailyCheckIn(),
): ProactiveAgentAlert | null {
  if (isCheckInComplete(record)) return null;
  const missing = missingRequiredSlots(record);
  if (missing.length === 0) return null;
  const labels = missing.slice(0, 3).map((s) => slotLabel(s, lang)).join(', ');
  return {
    id: `daily-checkin-${record.dateKey}`,
    kind: 'daily-checkin',
    severity: 'info',
    title: lang === 'el' ? 'Ήπια υπενθύμιση ρουτίνας' : 'Gentle routine nudge',
    message:
      lang === 'el'
        ? `Όποτε θες, στο chat μπορούμε να κλείσουμε μαζί: ${labels}. Χωρίς πίεση — ένα tap αρκεί.`
        : `Whenever you like, we can close these in chat together: ${labels}. No pressure — one tap is enough.`,
    action: {
      type: 'agent',
      mode: 'motivation',
      prompt:
        lang === 'el'
          ? 'Ας κάνουμε ήσυχα το σημερινό check-in μελέτης — ρώτα με ένα-ένα με έτοιμες επιλογές.'
          : "Let's gently do today's study check-in — ask me one thing at a time with ready options.",
    },
  };
}

/**
 * At most one reminder toast/inbox push per calendar day unless forced.
 * Returns the alert when a new reminder should fire.
 */
export function maybeDailyCheckInReminder(
  lang: Lang,
  opts?: { force?: boolean; now?: Date; record?: DailyCheckInRecord },
): ProactiveAgentAlert | null {
  const record = opts?.record ?? loadDailyCheckIn(opts?.now);
  const alert = buildDailyCheckInAlert(lang, record);
  if (!alert) return null;

  const log = loadJson<ReminderLog>(REMINDER_LOG_KEY, { byDate: {} });
  if (!opts?.force && log.byDate[record.dateKey]) return null;

  log.byDate[record.dateKey] = new Date().toISOString();
  // Keep log small
  const keys = Object.keys(log.byDate).sort();
  while (keys.length > 14) {
    const drop = keys.shift();
    if (drop) delete log.byDate[drop];
  }
  saveJson(REMINDER_LOG_KEY, log);
  return alert;
}
