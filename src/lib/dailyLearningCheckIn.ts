/**
 * Chat-first daily learning check-in.
 *
 * Soft, voluntary capture of the fields Synapse needs each day so the Agent
 * can auto-steer session length, focus course, intent, and coaching — without
 * forcing the learner through manual forms.
 */

import { loadJson, saveJson } from './persistence';
import type { Lang } from './i18n';
import type { Course, LearnerModel, Task } from '../types';

export const DAILY_CHECKIN_STORAGE_KEY = 'daily-checkin-v1';

/** Ordered slots for the daily routine (after a warm open greeting). */
export type CheckInSlotId =
  | 'openFeel'
  | 'energy'
  | 'availableMinutes'
  | 'sessionIntent'
  | 'focusCourse'
  | 'confidence'
  | 'blocker'
  | 'studiedToday';

export type EnergyLevel = 'low' | 'ok' | 'high';
export type SessionIntent = 'learn' | 'review' | 'practice' | 'exam' | 'light';
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type BlockerKind = 'none' | 'tired' | 'confused' | 'busy' | 'anxious';
export type StudiedToday = 'not-yet' | 'partial' | 'done';

export type DailyCheckInAnswers = {
  openFeel?: string;
  energy?: EnergyLevel;
  availableMinutes?: number;
  sessionIntent?: SessionIntent;
  focusCourseId?: string;
  focusCourseTitle?: string;
  confidence?: ConfidenceLevel;
  blocker?: BlockerKind;
  studiedToday?: StudiedToday;
};

export type DailyCheckInRecord = {
  dateKey: string;
  answers: DailyCheckInAnswers;
  /** Slot ids the learner explicitly skipped (still counts as addressed). */
  skipped: CheckInSlotId[];
  /** Soft intro greeting already sent in chat today. */
  greetingSent: boolean;
  completedAt?: string;
  updatedAt: string;
};

export type CheckInChip = {
  id: string;
  label: string;
  /** Text submitted as the user message when the chip is tapped. */
  value: string;
  /** Structured value applied to answers. */
  patch: Partial<DailyCheckInAnswers>;
};

export type CheckInPrompt = {
  slot: CheckInSlotId;
  /** Warm, non-interrogative prompt shown in chat. */
  prompt: string;
  chips: CheckInChip[];
  /** Allow free-text / voice in addition to chips. */
  allowFreeText: boolean;
};

const SLOT_ORDER: CheckInSlotId[] = [
  'openFeel',
  'energy',
  'availableMinutes',
  'sessionIntent',
  'focusCourse',
  'confidence',
  'blocker',
  'studiedToday',
];

/** Slots required for a "complete enough" daily routine. */
const REQUIRED_SLOTS: CheckInSlotId[] = [
  'energy',
  'availableMinutes',
  'sessionIntent',
  'focusCourse',
  'confidence',
];

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyCheckIn(dateKey = todayKey()): DailyCheckInRecord {
  return {
    dateKey,
    answers: {},
    skipped: [],
    greetingSent: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadDailyCheckIn(now = new Date()): DailyCheckInRecord {
  const key = todayKey(now);
  const stored = loadJson<DailyCheckInRecord | null>(DAILY_CHECKIN_STORAGE_KEY, null);
  if (stored && stored.dateKey === key) return stored;
  const fresh = emptyCheckIn(key);
  saveJson(DAILY_CHECKIN_STORAGE_KEY, fresh);
  return fresh;
}

export function saveDailyCheckIn(record: DailyCheckInRecord): void {
  saveJson(DAILY_CHECKIN_STORAGE_KEY, {
    ...record,
    updatedAt: new Date().toISOString(),
  });
}

function slotFilled(answers: DailyCheckInAnswers, slot: CheckInSlotId): boolean {
  switch (slot) {
    case 'openFeel':
      return Boolean(answers.openFeel?.trim());
    case 'energy':
      return answers.energy != null;
    case 'availableMinutes':
      return typeof answers.availableMinutes === 'number' && answers.availableMinutes > 0;
    case 'sessionIntent':
      return answers.sessionIntent != null;
    case 'focusCourse':
      return Boolean(answers.focusCourseId || answers.focusCourseTitle);
    case 'confidence':
      return answers.confidence != null;
    case 'blocker':
      return answers.blocker != null;
    case 'studiedToday':
      return answers.studiedToday != null;
    default:
      return false;
  }
}

export function isSlotAddressed(record: DailyCheckInRecord, slot: CheckInSlotId): boolean {
  return slotFilled(record.answers, slot) || record.skipped.includes(slot);
}

export function missingRequiredSlots(record: DailyCheckInRecord): CheckInSlotId[] {
  return REQUIRED_SLOTS.filter((s) => !isSlotAddressed(record, s));
}

export function isCheckInComplete(record: DailyCheckInRecord): boolean {
  return missingRequiredSlots(record).length === 0;
}

export function nextMissingSlot(record: DailyCheckInRecord): CheckInSlotId | null {
  for (const slot of SLOT_ORDER) {
    if (slot === 'openFeel' && record.greetingSent && !slotFilled(record.answers, 'openFeel')) {
      // Open feel is optional after greeting — skip if they already jumped to chips.
      if (record.skipped.includes('openFeel') || Object.keys(record.answers).length > 0) {
        continue;
      }
    }
    if (!isSlotAddressed(record, slot)) return slot;
  }
  return null;
}

export type CheckInContext = {
  lang: Lang;
  courses: Array<Pick<Course, 'id' | 'title'>>;
  tasks?: Array<Pick<Task, 'status' | 'category' | 'courseId' | 'courseName' | 'isSpacedRepetition'>>;
  learner?: Pick<LearnerModel, 'weakAreas' | 'preferredSessionLength' | 'bestTimeOfDay'>;
  reviewDueCount?: number;
};

function copy(lang: Lang, en: string, el: string): string {
  return lang === 'el' ? el : en;
}

export function buildWarmGreeting(ctx: CheckInContext, now = new Date()): string {
  const hour = now.getHours();
  const hello =
    ctx.lang === 'el'
      ? hour < 12
        ? 'Καλημέρα'
        : hour < 18
          ? 'Καλό απόγευμα'
          : 'Καλό βράδυ'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';

  const due = ctx.reviewDueCount ?? 0;
  if (ctx.lang === 'el') {
    if (due >= 3) {
      return `${hello} — πώς είμαστε σήμερα; Όταν θες, θα ρίξουμε μια ματιά μαζί στο τι μας ταιριάζει σήμερα (χωρίς πίεση). Έχεις και μερικές επαναλήψεις που περιμένουν όποτε νιώσεις έτοιμος/η.`;
    }
    return `${hello} — πώς είμαστε σήμερα; Πες μου με δυο λόγια πώς νιώθεις, και μετά θα βάλουμε ήσυχα στη σειρά το σημερινό πλάνο μελέτης.`;
  }
  if (due >= 3) {
    return `${hello} — how are we doing today? Whenever you're ready, we can gently figure out what fits today (no pressure). A few reviews are waiting whenever you feel up for them.`;
  }
  return `${hello} — how are we doing today? Share a quick vibe check, and then we'll quietly line up today's study plan together.`;
}

function historyHintMinutes(learner?: CheckInContext['learner']): number | undefined {
  const n = learner?.preferredSessionLength;
  if (typeof n === 'number' && n > 0) return n;
  return undefined;
}

export function buildSlotPrompt(slot: CheckInSlotId, ctx: CheckInContext): CheckInPrompt {
  const { lang, courses } = ctx;
  const histMin = historyHintMinutes(ctx.learner);
  const weak = ctx.learner?.weakAreas?.[0]?.concept;

  switch (slot) {
    case 'openFeel':
      return {
        slot,
        prompt: copy(
          lang,
          'No rush — how are you feeling as we start? Tap a vibe or just type/speak whatever comes up.',
          'Χωρίς βιασύνη — πώς νιώθεις καθώς ξεκινάμε; Διάλεξε μια αίσθηση ή πες/γράψε ό,τι σου βγει.',
        ),
        allowFreeText: true,
        chips: [
          {
            id: 'feel-ok',
            label: copy(lang, 'Pretty okay', 'Εντάξει είμαι'),
            value: copy(lang, "I'm pretty okay today.", 'Εντάξει είμαι σήμερα.'),
            patch: { openFeel: 'ok' },
          },
          {
            id: 'feel-tired',
            label: copy(lang, 'A bit tired', 'Λίγο κουρασμένος/η'),
            value: copy(lang, "I'm a bit tired.", 'Είμαι λίγο κουρασμένος/η.'),
            patch: { openFeel: 'tired' },
          },
          {
            id: 'feel-motivated',
            label: copy(lang, 'Motivated', 'Έχω διάθεση'),
            value: copy(lang, "I'm feeling motivated.", 'Έχω διάθεση σήμερα.'),
            patch: { openFeel: 'motivated' },
          },
          {
            id: 'feel-stressed',
            label: copy(lang, 'A little stressed', 'Λίγο αγχωμένος/η'),
            value: copy(lang, "I'm a little stressed.", 'Είμαι λίγο αγχωμένος/η.'),
            patch: { openFeel: 'stressed' },
          },
        ],
      };

    case 'energy':
      return {
        slot,
        prompt: copy(
          lang,
          'Where is your energy for studying right now?',
          'Πού βρίσκεται η ενέργειά σου για μελέτη αυτή τη στιγμή;',
        ),
        allowFreeText: true,
        chips: [
          {
            id: 'energy-low',
            label: copy(lang, 'Low — keep it light', 'Χαμηλή — ελαφριά'),
            value: copy(lang, 'My energy is low — keep it light.', 'Η ενέργειά μου είναι χαμηλή — κράτα το ελαφρύ.'),
            patch: { energy: 'low' },
          },
          {
            id: 'energy-ok',
            label: copy(lang, 'Steady / okay', 'Σταθερή / οκ'),
            value: copy(lang, 'Energy is okay / steady.', 'Η ενέργεια είναι οκ / σταθερή.'),
            patch: { energy: 'ok' },
          },
          {
            id: 'energy-high',
            label: copy(lang, 'High — ready to dig in', 'Υψηλή — έτοιμος/η'),
            value: copy(lang, 'Energy is high — ready to dig in.', 'Υψηλή ενέργεια — έτοιμος/η να μπω βαθιά.'),
            patch: { energy: 'high' },
          },
        ],
      };

    case 'availableMinutes': {
      const chips: CheckInChip[] = [
        {
          id: 'min-10',
          label: '10′',
          value: copy(lang, 'I have about 10 minutes.', 'Έχω περίπου 10 λεπτά.'),
          patch: { availableMinutes: 10 },
        },
        {
          id: 'min-25',
          label: '25′',
          value: copy(lang, 'I have about 25 minutes.', 'Έχω περίπου 25 λεπτά.'),
          patch: { availableMinutes: 25 },
        },
        {
          id: 'min-50',
          label: '50′',
          value: copy(lang, 'I have about 50 minutes.', 'Έχω περίπου 50 λεπτά.'),
          patch: { availableMinutes: 50 },
        },
      ];
      if (histMin && ![10, 25, 50].includes(histMin)) {
        chips.unshift({
          id: `min-hist-${histMin}`,
          label: copy(lang, `Usually ${histMin}′`, `Συνήθως ${histMin}′`),
          value: copy(
            lang,
            `Same as usual — about ${histMin} minutes.`,
            `Όπως συνήθως — περίπου ${histMin} λεπτά.`,
          ),
          patch: { availableMinutes: histMin },
        });
      } else if (histMin) {
        // Highlight habitual length by putting it first.
        chips.sort((a, b) => {
          const am = a.patch.availableMinutes === histMin ? 0 : 1;
          const bm = b.patch.availableMinutes === histMin ? 0 : 1;
          return am - bm;
        });
        const preferred = chips.find((c) => c.patch.availableMinutes === histMin);
        if (preferred) {
          preferred.label = copy(lang, `${histMin}′ (your usual)`, `${histMin}′ (το συνηθισμένο σου)`);
        }
      }
      return {
        slot,
        prompt: copy(
          lang,
          histMin
            ? `How much time do you actually have today? (You often land around ${histMin}′.)`
            : 'How much time do you actually have today?',
          histMin
            ? `Πόσο χρόνο έχεις πραγματικά σήμερα; (Συχνά κάθεσαι γύρω στα ${histMin}′.)`
            : 'Πόσο χρόνο έχεις πραγματικά σήμερα;',
        ),
        allowFreeText: true,
        chips,
      };
    }

    case 'sessionIntent': {
      const reviewHint = (ctx.reviewDueCount ?? 0) >= 2;
      const chips: CheckInChip[] = [
        {
          id: 'intent-learn',
          label: copy(lang, 'Learn something new', 'Νέο υλικό'),
          value: copy(lang, "I'd like to learn something new.", 'Θα ήθελα να δω νέο υλικό.'),
          patch: { sessionIntent: 'learn' },
        },
        {
          id: 'intent-review',
          label: copy(lang, reviewHint ? 'Review (due items)' : 'Review / recall', reviewHint ? 'Επανάληψη (due)' : 'Επανάληψη'),
          value: copy(lang, "I'd like to review / do recall.", 'Θα ήθελα επανάληψη / ανάκληση.'),
          patch: { sessionIntent: 'review' },
        },
        {
          id: 'intent-practice',
          label: copy(lang, 'Practice / exercises', 'Εξάσκηση'),
          value: copy(lang, "I'd like to practice.", 'Θα ήθελα εξάσκηση.'),
          patch: { sessionIntent: 'practice' },
        },
        {
          id: 'intent-exam',
          label: copy(lang, 'Exam prep', 'Προετοιμασία εξετάσεων'),
          value: copy(lang, 'I want exam-style prep.', 'Θέλω προετοιμασία εξετάσεων.'),
          patch: { sessionIntent: 'exam' },
        },
        {
          id: 'intent-light',
          label: copy(lang, 'Just a light touch', 'Ελαφριά επαφή'),
          value: copy(lang, 'Just a light touch today.', 'Μόνο μια ελαφριά επαφή σήμερα.'),
          patch: { sessionIntent: 'light' },
        },
      ];
      return {
        slot,
        prompt: copy(
          lang,
          weak
            ? `What kind of session feels right? (We can also gently touch “${weak}” if you want.)`
            : 'What kind of session feels right today?',
          weak
            ? `Τι είδους συνεδρία σου ταιριάζει; (Μπορούμε και ήπια να αγγίξουμε το «${weak}» αν θες.)`
            : 'Τι είδους συνεδρία σου ταιριάζει σήμερα;',
        ),
        allowFreeText: true,
        chips,
      };
    }

    case 'focusCourse': {
      const top = courses.slice(0, 4);
      const chips: CheckInChip[] = top.map((c) => ({
        id: `course-${c.id}`,
        label: c.title.length > 28 ? `${c.title.slice(0, 26)}…` : c.title,
        value: copy(lang, `Let's focus on ${c.title}.`, `Ας εστιάσουμε στο ${c.title}.`),
        patch: { focusCourseId: c.id, focusCourseTitle: c.title },
      }));
      if (chips.length === 0) {
        chips.push({
          id: 'course-any',
          label: copy(lang, 'Whatever you suggest', 'Ό,τι προτείνεις εσύ'),
          value: copy(lang, 'Suggest the best focus for me.', 'Πρότεινέ μου το καλύτερο focus.'),
          patch: { focusCourseTitle: 'suggested' },
        });
      } else {
        chips.push({
          id: 'course-suggest',
          label: copy(lang, 'You pick for me', 'Διάλεξε εσύ'),
          value: copy(lang, 'You pick the best focus for me.', 'Διάλεξε εσύ το καλύτερο focus για μένα.'),
          patch: { focusCourseTitle: 'suggested' },
        });
      }
      return {
        slot,
        prompt: copy(
          lang,
          'Which material should we orbit around today?',
          'Γύρω από ποιο υλικό να κινηθούμε σήμερα;',
        ),
        allowFreeText: true,
        chips,
      };
    }

    case 'confidence':
      return {
        slot,
        prompt: copy(
          lang,
          'Quick confidence check on what you want to touch today?',
          'Γρήγορο check αυτοπεποίθησης για αυτό που θες να αγγίξεις σήμερα;',
        ),
        allowFreeText: true,
        chips: ([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((n) => ({
          id: `conf-${n}`,
          label: `${n}/5`,
          value: copy(lang, `Confidence about ${n} out of 5.`, `Αυτοπεποίθηση περίπου ${n} στα 5.`),
          patch: { confidence: n },
        })),
      };

    case 'blocker':
      return {
        slot,
        prompt: copy(
          lang,
          'Anything quietly getting in the way — or are we clear?',
          'Υπάρχει κάτι που σιγά σιγά μπαίνει στη μέση — ή είμαστε καθαρά;',
        ),
        allowFreeText: true,
        chips: [
          {
            id: 'block-none',
            label: copy(lang, 'All clear', 'Όλα οκ'),
            value: copy(lang, 'Nothing in the way.', 'Τίποτα στη μέση.'),
            patch: { blocker: 'none' },
          },
          {
            id: 'block-tired',
            label: copy(lang, 'Tired', 'Κούραση'),
            value: copy(lang, "I'm tired.", 'Είμαι κουρασμένος/η.'),
            patch: { blocker: 'tired' },
          },
          {
            id: 'block-confused',
            label: copy(lang, 'Confused', 'Μπερδεμένος/η'),
            value: copy(lang, "I'm confused on something.", 'Είμαι μπερδεμένος/η σε κάτι.'),
            patch: { blocker: 'confused' },
          },
          {
            id: 'block-busy',
            label: copy(lang, 'Short on time', 'Λίγος χρόνος'),
            value: copy(lang, "I'm short on time.", 'Έχω λίγο χρόνο.'),
            patch: { blocker: 'busy' },
          },
          {
            id: 'block-anxious',
            label: copy(lang, 'Exam nerves', 'Άγχος εξετάσεων'),
            value: copy(lang, 'Exam nerves are up.', 'Έχω άγχος εξετάσεων.'),
            patch: { blocker: 'anxious' },
          },
        ],
      };

    case 'studiedToday':
      return {
        slot,
        prompt: copy(
          lang,
          'Have you already studied a bit today, or are we just getting started?',
          'Έχεις ήδη μελετήσει λίγο σήμερα, ή μόλις ξεκινάμε;',
        ),
        allowFreeText: true,
        chips: [
          {
            id: 'studied-not',
            label: copy(lang, 'Not yet', 'Όχι ακόμα'),
            value: copy(lang, "I haven't studied yet today.", 'Δεν έχω μελετήσει ακόμα σήμερα.'),
            patch: { studiedToday: 'not-yet' },
          },
          {
            id: 'studied-partial',
            label: copy(lang, 'A little already', 'Λίγο ήδη'),
            value: copy(lang, 'I already studied a little.', 'Έχω ήδη μελετήσει λίγο.'),
            patch: { studiedToday: 'partial' },
          },
          {
            id: 'studied-done',
            label: copy(lang, 'Main session done', 'Κύρια συνεδρία έτοιμη'),
            value: copy(lang, 'Main study session is already done.', 'Η κύρια συνεδρία είναι ήδη έτοιμη.'),
            patch: { studiedToday: 'done' },
          },
        ],
      };
  }
}

/** Heuristic parse of free text / voice into a patch for the active slot. */
export function parseFreeTextForSlot(
  slot: CheckInSlotId,
  text: string,
  ctx: CheckInContext,
): Partial<DailyCheckInAnswers> | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  switch (slot) {
    case 'openFeel':
      return { openFeel: text.trim().slice(0, 240) };

    case 'energy': {
      if (/χαμηλ|κουρασ|tired|low|exhausted|νυστ/i.test(t)) return { energy: 'low' };
      if (/υψηλ|high|motiv|έτοιμ|ready|φουλ|full/i.test(t)) return { energy: 'high' };
      if (/οκ|okay|ok|steady|σταθερ|μέτρια|medium|fine|εντάξει/i.test(t)) return { energy: 'ok' };
      return { energy: 'ok', openFeel: text.trim().slice(0, 120) };
    }

    case 'availableMinutes': {
      const m = t.match(/(\d{1,3})\s*(′|'|min|λεπτ)?/i);
      if (m) {
        const n = Math.min(180, Math.max(5, Number(m[1])));
        return { availableMinutes: n };
      }
      if (/μισ[ήι]|half|30/i.test(t)) return { availableMinutes: 30 };
      if (/ώρα|hour|60/i.test(t)) return { availableMinutes: 60 };
      if (/pomodoro|πομοδόρο|25/i.test(t)) return { availableMinutes: 25 };
      return null;
    }

    case 'sessionIntent': {
      if (/exam|εξέτασ|τεστ|test|cram/i.test(t)) return { sessionIntent: 'exam' };
      if (/review|επανάλ|ανάκλη|flash|leitner|recall/i.test(t)) return { sessionIntent: 'review' };
      if (/practic|εξάσκ|άσκησ|quiz|ασκήσ/i.test(t)) return { sessionIntent: 'practice' };
      if (/light|ελαφρ|χαλαρ|easy/i.test(t)) return { sessionIntent: 'light' };
      if (/learn|νέο|καινούρ|διάβασ|theory|θεωρ/i.test(t)) return { sessionIntent: 'learn' };
      return null;
    }

    case 'focusCourse': {
      const hit = ctx.courses.find((c) => t.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(t.slice(0, 12)));
      if (hit) return { focusCourseId: hit.id, focusCourseTitle: hit.title };
      if (/suggest|πρότειν|διάλεξε|you pick|ότι θες|ό,τι/i.test(t)) {
        return { focusCourseTitle: 'suggested' };
      }
      return { focusCourseTitle: text.trim().slice(0, 80) };
    }

    case 'confidence': {
      const m = t.match(/\b([1-5])\b/);
      if (m) return { confidence: Number(m[1]) as ConfidenceLevel };
      if (/χαμηλ|low|άσχημ/i.test(t)) return { confidence: 2 };
      if (/υψηλ|high|καλά|confident/i.test(t)) return { confidence: 4 };
      if (/μέτρια|medium|ok|οκ/i.test(t)) return { confidence: 3 };
      return null;
    }

    case 'blocker': {
      if (/τίποτα|nothing|clear|καθαρά|όλα οκ|all clear|no blocker/i.test(t)) return { blocker: 'none' };
      if (/κουρασ|tired/i.test(t)) return { blocker: 'tired' };
      if (/μπερδ|confused|δεν καταλαβ/i.test(t)) return { blocker: 'confused' };
      if (/χρόνο|busy|βιάζ|time/i.test(t)) return { blocker: 'busy' };
      if (/άγχ|anxi|nerv|φοβ/i.test(t)) return { blocker: 'anxious' };
      return { blocker: 'none', openFeel: text.trim().slice(0, 120) };
    }

    case 'studiedToday': {
      if (/όχι|not yet|haven't|δεν έχω/i.test(t)) return { studiedToday: 'not-yet' };
      if (/λίγο|partial|already a little|ήδη λίγο/i.test(t)) return { studiedToday: 'partial' };
      if (/τελείωσ|done|finished|έτοιμ/i.test(t)) return { studiedToday: 'done' };
      return null;
    }

    default:
      return null;
  }
}

export function applyCheckInPatch(
  record: DailyCheckInRecord,
  patch: Partial<DailyCheckInAnswers>,
  opts?: { skipSlot?: CheckInSlotId },
): DailyCheckInRecord {
  const answers = { ...record.answers, ...patch };
  const skipped = opts?.skipSlot
    ? Array.from(new Set([...record.skipped, opts.skipSlot]))
    : record.skipped;
  const next: DailyCheckInRecord = {
    ...record,
    answers,
    skipped,
    updatedAt: new Date().toISOString(),
  };
  if (isCheckInComplete(next) && !next.completedAt) {
    next.completedAt = new Date().toISOString();
  }
  return next;
}

export function markGreetingSent(record: DailyCheckInRecord): DailyCheckInRecord {
  return { ...record, greetingSent: true, updatedAt: new Date().toISOString() };
}

export function skipSlot(record: DailyCheckInRecord, slot: CheckInSlotId): DailyCheckInRecord {
  return applyCheckInPatch(record, {}, { skipSlot: slot });
}

/** Map check-in → learner model nudges (session length, time-of-day, confidence). */
export function learnerPatchFromCheckIn(
  answers: DailyCheckInAnswers,
  now = new Date(),
): Partial<LearnerModel> {
  const patch: Partial<LearnerModel> = {};
  if (typeof answers.availableMinutes === 'number' && answers.availableMinutes > 0) {
    patch.preferredSessionLength = answers.availableMinutes;
  }
  const hour = now.getHours();
  patch.bestTimeOfDay =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  if (answers.confidence != null) {
    // Map 1–5 → 0.2–1.0 contribution toward averageConfidence (gentle blend later).
    patch.averageConfidence = answers.confidence / 5;
  }
  return patch;
}

/** Human summary for Agent system context. */
export function checkInContextBlock(record: DailyCheckInRecord, lang: Lang): string {
  if (!record.greetingSent && Object.keys(record.answers).length === 0) return '';
  const a = record.answers;
  const lines: string[] = [];
  if (lang === 'el') {
    lines.push('Σημερινό check-in μελέτης (συμπληρώθηκε από χαλαρή συζήτηση):');
    if (a.openFeel) lines.push(`- Αίσθηση: ${a.openFeel}`);
    if (a.energy) lines.push(`- Ενέργεια: ${a.energy}`);
    if (a.availableMinutes) lines.push(`- Διαθέσιμα λεπτά: ${a.availableMinutes}`);
    if (a.sessionIntent) lines.push(`- Πρόθεση: ${a.sessionIntent}`);
    if (a.focusCourseTitle || a.focusCourseId) {
      lines.push(`- Focus: ${a.focusCourseTitle ?? a.focusCourseId}`);
    }
    if (a.confidence != null) lines.push(`- Αυτοπεποίθηση: ${a.confidence}/5`);
    if (a.blocker) lines.push(`- Εμπόδιο: ${a.blocker}`);
    if (a.studiedToday) lines.push(`- Μελέτη σήμερα: ${a.studiedToday}`);
    const missing = missingRequiredSlots(record);
    if (missing.length) {
      lines.push(`- Ακόμα ανοιχτά (ρώτα ήπια, με chips, χωρίς πίεση): ${missing.join(', ')}`);
    }
  } else {
    lines.push("Today's study check-in (captured from casual chat):");
    if (a.openFeel) lines.push(`- Feel: ${a.openFeel}`);
    if (a.energy) lines.push(`- Energy: ${a.energy}`);
    if (a.availableMinutes) lines.push(`- Available minutes: ${a.availableMinutes}`);
    if (a.sessionIntent) lines.push(`- Intent: ${a.sessionIntent}`);
    if (a.focusCourseTitle || a.focusCourseId) {
      lines.push(`- Focus: ${a.focusCourseTitle ?? a.focusCourseId}`);
    }
    if (a.confidence != null) lines.push(`- Confidence: ${a.confidence}/5`);
    if (a.blocker) lines.push(`- Blocker: ${a.blocker}`);
    if (a.studiedToday) lines.push(`- Studied today: ${a.studiedToday}`);
    const missing = missingRequiredSlots(record);
    if (missing.length) {
      lines.push(`- Still open (ask gently with chips, never interrogate): ${missing.join(', ')}`);
    }
  }
  return lines.join('\n');
}

export function completionAck(
  lang: Lang,
  answers: DailyCheckInAnswers,
  opts?: { autoStart?: boolean },
): string {
  const mins = answers.availableMinutes ?? 25;
  const intent = answers.sessionIntent ?? 'learn';
  const focus = answers.focusCourseTitle && answers.focusCourseTitle !== 'suggested'
    ? answers.focusCourseTitle
    : null;
  const auto = Boolean(opts?.autoStart);
  if (lang === 'el') {
    const plan = focus
      ? `Πλάνο: ~${mins}′ με πρόθεση «${intent}» γύρω από «${focus}».`
      : `Πλάνο: ~${mins}′ με πρόθεση «${intent}».`;
    return auto
      ? `Τέλεια — το σημερινό πλάνο μπήκε ήσυχα στη θέση του. ${plan}`
      : `Τέλεια — το σημερινό πλάνο μπήκε ήσυχα στη θέση του. ${plan} Όποτε θες, ξεκινάμε· αλλιώς απλώς πες μου τι σου έρχεται.`;
  }
  const plan = focus
    ? `Plan: ~${mins}′ with a “${intent}” vibe around “${focus}”.`
    : `Plan: ~${mins}′ with a “${intent}” vibe.`;
  return auto
    ? `Nice — today's plan is quietly in place. ${plan}`
    : `Nice — today's plan is quietly in place. ${plan} Whenever you want, we start; otherwise just tell me what comes up.`;
}

export { SLOT_ORDER, REQUIRED_SLOTS };
