/**
 * Passive multi-slot extraction of daily study signals from casual chat.
 * Heuristic-first; optional LLM JSON when available.
 */

import { chatCompletion, isLlmAvailable } from './llmClient';
import type { UserSettings } from '../types';
import {
  type CheckInContext,
  type CheckInSlotId,
  type DailyCheckInAnswers,
  type ConfidenceLevel,
  parseFreeTextForSlot,
} from './dailyLearningCheckIn';

const MULTI_SLOTS: CheckInSlotId[] = [
  'energy',
  'availableMinutes',
  'sessionIntent',
  'focusCourse',
  'confidence',
  'blocker',
  'studiedToday',
  'openFeel',
];

export type StudySignalExtraction = {
  patch: Partial<DailyCheckInAnswers>;
  /** Slots that were filled from this utterance. */
  filledSlots: CheckInSlotId[];
  source: 'heuristic' | 'llm' | 'merged';
};

function mergePatches(
  ...parts: Array<Partial<DailyCheckInAnswers> | null | undefined>
): Partial<DailyCheckInAnswers> {
  const out: Partial<DailyCheckInAnswers> = {};
  for (const p of parts) {
    if (!p) continue;
    Object.assign(out, p);
  }
  return out;
}

function slotsFromPatch(patch: Partial<DailyCheckInAnswers>): CheckInSlotId[] {
  const filled: CheckInSlotId[] = [];
  if (patch.openFeel != null) filled.push('openFeel');
  if (patch.energy != null) filled.push('energy');
  if (patch.availableMinutes != null) filled.push('availableMinutes');
  if (patch.sessionIntent != null) filled.push('sessionIntent');
  if (patch.focusCourseId != null || patch.focusCourseTitle != null) filled.push('focusCourse');
  if (patch.confidence != null) filled.push('confidence');
  if (patch.blocker != null) filled.push('blocker');
  if (patch.studiedToday != null) filled.push('studiedToday');
  return filled;
}

/**
 * Multi-slot heuristic: run every slot parser and keep non-null fields.
 * Avoids openFeel swallowing the whole message when structured signals exist.
 */
export function extractStudySignalsHeuristic(
  text: string,
  ctx: CheckInContext,
): StudySignalExtraction {
  const raw = text.trim();
  if (!raw) return { patch: {}, filledSlots: [], source: 'heuristic' };

  const parts: Array<Partial<DailyCheckInAnswers> | null> = [];
  for (const slot of MULTI_SLOTS) {
    if (slot === 'openFeel') continue;
    // focusCourse: only accept real course hits / suggest — not free title dump
    if (slot === 'focusCourse') {
      const t = raw.toLowerCase();
      const hit = ctx.courses.find(
        (c) => t.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(t.slice(0, 12)),
      );
      if (hit) {
        parts.push({ focusCourseId: hit.id, focusCourseTitle: hit.title });
      } else if (/suggest|πρότειν|διάλεξε|you pick/i.test(t)) {
        parts.push({ focusCourseTitle: 'suggested' });
      }
      continue;
    }
    // confidence: only when explicit scale language
    if (slot === 'confidence') {
      const t = raw.toLowerCase();
      const m = t.match(/(?:confidence|αυτοπεποίθηση|confident)\s*(?:about|≈|~|:)?\s*([1-5])(?:\s*\/\s*5)?/i)
        ?? t.match(/\b([1-5])\s*\/\s*5\b/);
      if (m) parts.push({ confidence: Number(m[1]) as ConfidenceLevel });
      continue;
    }
    // blocker: only when clear blocker language (tired alone may be energy)
    if (slot === 'blocker') {
      const t = raw.toLowerCase();
      if (/τίποτα στη μέση|nothing in the way|all clear|όλα οκ|no blocker/i.test(t)) {
        parts.push({ blocker: 'none' });
      } else if (/μπερδ|confused|δεν καταλαβ/i.test(t)) {
        parts.push({ blocker: 'confused' });
      } else if (/(λίγο χρόνο|short on time|βιάζ|πολύ busy)/i.test(t)) {
        parts.push({ blocker: 'busy' });
      } else if (/άγχ|anxi|nerv|φοβ.*εξέτα/i.test(t)) {
        parts.push({ blocker: 'anxious' });
      } else if (/(εμπόδιο|blocker|getting in the way)/i.test(t) && /κουρασ|tired/i.test(t)) {
        parts.push({ blocker: 'tired' });
      }
      continue;
    }
    parts.push(parseFreeTextForSlot(slot, raw, ctx));
  }

  let patch = mergePatches(...parts);

  // Energy from tired language if not set
  if (!patch.energy && /κουρασ|tired|exhausted|νυστ/i.test(raw)) {
    patch = { ...patch, energy: 'low' };
  }

  // Soft openFeel only when we captured almost nothing structured
  if (slotsFromPatch(patch).length === 0 && raw.length >= 2 && raw.length <= 240) {
    patch = { openFeel: raw.slice(0, 240) };
  }

  const filledSlots = slotsFromPatch(patch);
  return { patch, filledSlots, source: 'heuristic' };
}

function sanitizeLlmPatch(
  raw: Record<string, unknown>,
  ctx: CheckInContext,
): Partial<DailyCheckInAnswers> {
  const patch: Partial<DailyCheckInAnswers> = {};
  const energy = raw.energy;
  if (energy === 'low' || energy === 'ok' || energy === 'high') patch.energy = energy;
  if (typeof raw.availableMinutes === 'number' && raw.availableMinutes >= 5 && raw.availableMinutes <= 180) {
    patch.availableMinutes = Math.round(raw.availableMinutes);
  }
  const intent = raw.sessionIntent;
  if (
    intent === 'learn' || intent === 'review' || intent === 'practice'
    || intent === 'exam' || intent === 'light'
  ) {
    patch.sessionIntent = intent;
  }
  if (typeof raw.confidence === 'number' && raw.confidence >= 1 && raw.confidence <= 5) {
    patch.confidence = Math.round(raw.confidence) as ConfidenceLevel;
  }
  const blocker = raw.blocker;
  if (
    blocker === 'none' || blocker === 'tired' || blocker === 'confused'
    || blocker === 'busy' || blocker === 'anxious'
  ) {
    patch.blocker = blocker;
  }
  const studied = raw.studiedToday;
  if (studied === 'not-yet' || studied === 'partial' || studied === 'done') {
    patch.studiedToday = studied;
  }
  if (typeof raw.openFeel === 'string' && raw.openFeel.trim()) {
    patch.openFeel = raw.openFeel.trim().slice(0, 240);
  }
  if (typeof raw.focusCourseTitle === 'string' && raw.focusCourseTitle.trim()) {
    const title = raw.focusCourseTitle.trim();
    const hit = ctx.courses.find(
      (c) => c.title.toLowerCase() === title.toLowerCase()
        || c.title.toLowerCase().includes(title.toLowerCase())
        || title.toLowerCase().includes(c.title.toLowerCase()),
    );
    if (hit) {
      patch.focusCourseId = hit.id;
      patch.focusCourseTitle = hit.title;
    } else if (title === 'suggested') {
      patch.focusCourseTitle = 'suggested';
    }
  }
  if (typeof raw.focusCourseId === 'string') {
    const hit = ctx.courses.find((c) => c.id === raw.focusCourseId);
    if (hit) {
      patch.focusCourseId = hit.id;
      patch.focusCourseTitle = hit.title;
    }
  }
  return patch;
}

async function extractStudySignalsLlm(
  text: string,
  ctx: CheckInContext,
  settings?: UserSettings,
): Promise<Partial<DailyCheckInAnswers> | null> {
  if (!isLlmAvailable(settings)) return null;
  const courseList = ctx.courses.slice(0, 12).map((c) => `${c.id}:${c.title}`).join('; ') || '(none)';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content: `Extract daily study check-in fields from a casual learner message.
Respond with ONLY compact JSON (no markdown). Keys allowed:
energy ("low"|"ok"|"high"), availableMinutes (number 5-180),
sessionIntent ("learn"|"review"|"practice"|"exam"|"light"),
focusCourseId (string id), focusCourseTitle (course title or "suggested"),
confidence (1-5), blocker ("none"|"tired"|"confused"|"busy"|"anxious"),
studiedToday ("not-yet"|"partial"|"done"), openFeel (short string).
Omit unknown keys. Known courses: ${courseList}
Language of message may be Greek or English.`,
        },
        { role: 'user', content: text.slice(0, 800) },
      ],
      settings,
      { temperature: 0, maxTokens: 220 },
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return sanitizeLlmPatch(parsed, ctx);
  } catch {
    return null;
  }
}

/**
 * Extract study signals: heuristic always; LLM merge when available and
 * heuristic found fewer than 2 slots (or always when preferLlm).
 */
export async function extractStudySignals(
  text: string,
  ctx: CheckInContext,
  settings?: UserSettings,
  opts?: { preferLlm?: boolean },
): Promise<StudySignalExtraction> {
  const heuristic = extractStudySignalsHeuristic(text, ctx);
  const wantLlm = Boolean(opts?.preferLlm) || heuristic.filledSlots.length < 2;
  if (!wantLlm || !isLlmAvailable(settings)) return heuristic;

  const llmPatch = await extractStudySignalsLlm(text, ctx, settings);
  if (!llmPatch || Object.keys(llmPatch).length === 0) return heuristic;

  // Heuristic wins on conflicts for numeric/minutes/course id already found.
  const patch = mergePatches(llmPatch, heuristic.patch);
  return {
    patch,
    filledSlots: slotsFromPatch(patch),
    source: heuristic.filledSlots.length ? 'merged' : 'llm',
  };
}

/** True when this utterance looks like study-routine signal (not pure academic Q). */
export function looksLikeStudyRoutineUtterance(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (t.length > 400) return false;
  return /κουρασ|tired|λεπτ|min\b|επανάλ|review|εξάσκ|practice|εξέτασ|exam|ενέργ|energy|διάθεση|motiv|pomodoro|αυτοπεποίθ|confidence|\b([1-5])\s*\/\s*5|άγχ|anxi|μελέτησ|studied|σήμερα|today|έτοιμ|ready|ελαφρ|light session|busy|χρόνο/i.test(t);
}
