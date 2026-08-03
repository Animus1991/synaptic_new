/**
 * Adaptive Agent personality: mode + settings tone + light mirroring of the
 * learner's register — never insulting, never interrogative.
 */

import type { AgentMode, UserSettings } from '../types';
import type { DailyCheckInRecord } from './dailyLearningCheckIn';
import { checkInContextBlock } from './dailyLearningCheckIn';

export type SpeechRegister = 'casual' | 'neutral' | 'formal';

/** Infer register from recent user messages (simple heuristic). */
export function inferSpeechRegister(recentUserTexts: string[]): SpeechRegister {
  const sample = recentUserTexts.slice(-6).join(' ').toLowerCase();
  if (!sample.trim()) return 'neutral';
  let casual = 0;
  let formal = 0;
  if (/(lol|haha|χαχα|ρε|φίλε|btw|kinda|idk|δλδ|κλπ|εε+|ουφ)/i.test(sample)) casual += 2;
  if (/(please|ευχαριστώ|παρακαλώ|θα ήθελα|could you|would you)/i.test(sample)) formal += 1;
  if (/(δηλαδή|συνεπώς|ωστόσο|therefore|however|regarding)/i.test(sample)) formal += 2;
  if (sample.length < 40 && !/[.?!;]/.test(sample)) casual += 1;
  if (formal >= casual + 1) return 'formal';
  if (casual >= formal + 1) return 'casual';
  return 'neutral';
}

function toneGuidance(settings?: UserSettings): string {
  const tone = settings?.feedbackTone ?? 'balanced';
  if (tone === 'gentle') {
    return 'Tone: warm, unhurried, encouraging. Never scold. Soften requests as invitations.';
  }
  if (tone === 'strict') {
    return 'Tone: crisp and precise, still respectful. High standards without sarcasm or insult.';
  }
  return 'Tone: friendly and clear — neither syrupy nor harsh.';
}

function registerGuidance(register: SpeechRegister, lang: 'en' | 'el'): string {
  if (register === 'casual') {
    return lang === 'el'
      ? 'Καθρέφτισε ήπια τον χαλαρό τόνο του χρήστη (χωρίς slang που προσβάλλει, χωρίς υπερβολικά meme).'
      : 'Gently mirror the learner’s casual register (no insulting slang, no meme overload).';
  }
  if (register === 'formal') {
    return lang === 'el'
      ? 'Κράτα πιο προσεγμένο, ευγενικό ύφος· απόφυγε υπερβολική οικειότητα.'
      : 'Keep a polished, polite register; avoid forced familiarity.';
  }
  return lang === 'el'
    ? 'Ουδέτερο-φιλικό ύφος· προσάρμοσε σταδιακά αν αλλάξει ο χρήστης.'
    : 'Neutral-friendly register; adapt gradually if the learner shifts.';
}

/**
 * Coaching layer: chat-first extraction of daily study fields without
 * interrogation. Used by Agent system prompts.
 */
export function buildConversationalCoachingBlock(opts: {
  settings?: UserSettings;
  mode: AgentMode;
  checkIn?: DailyCheckInRecord | null;
  recentUserTexts?: string[];
}): string {
  const lang = opts.settings?.language === 'el' ? 'el' : 'en';
  const register = inferSpeechRegister(opts.recentUserTexts ?? []);
  const checkBlock = opts.checkIn ? checkInContextBlock(opts.checkIn, lang) : '';

  const core =
    lang === 'el'
      ? [
          'Ανθρωποκεντρικό coaching μελέτης:',
          '- Ξεκίνα χαλαρά· μην κάνεις ανάκριση.',
          '- Όταν χρειάζεσαι δεδομένα ρουτίνας (ενέργεια, λεπτά, πρόθεση, μάθημα, αυτοπεποίθηση), ρώτα ΕΝΑ πράγμα τη φορά, με συγκεκριμένες προτάσεις απάντησης (κλειστού τύπου).',
          '- Πρότεινε εναλλακτικές προσαρμοσμένες στο ιστορικό/στόχους (π.χ. πιο ελαφριά συνεδρία αν είναι κουρασμένος/η).',
          '- Συμπλήρωσε νοερά τα πεδία της εφαρμογής από τη συζήτηση· μην ζητάς από τον χρήστη να ψάξει manual σε φόρμες.',
          '- Ποτέ μην προσβάλλεις, μην ειρωνεύεσαι αδυναμίες, μην πιέζεις για «πρέπει».',
        ].join('\n')
      : [
          'Human-centered study coaching:',
          '- Start casually; never interrogate.',
          '- When you need routine fields (energy, minutes, intent, course, confidence), ask ONE thing at a time with concrete closed-style answer options.',
          '- Offer alternatives shaped by history/goals (e.g. a lighter session if they are tired).',
          '- Mentally fill app fields from conversation; do not send the learner hunting through manual forms.',
          '- Never insult, mock weaknesses, or guilt-trip with “you should”.',
        ].join('\n');

  return [
    core,
    toneGuidance(opts.settings),
    registerGuidance(register, lang),
    checkBlock,
  ]
    .filter(Boolean)
    .join('\n');
}
