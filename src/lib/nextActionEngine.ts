/**
 * Contextual next-best-action for the study workspace (Prompt 7).
 * Workspace branch of unifiedAdaptiveScheduler.recommendDailyPlan().
 */

import type { Lang } from './i18n';
import type { ActivityItem } from '../types';
import type { LearningActionId } from './workspaceLearningActions';
import { getLearningActions } from './workspaceLearningActions';
import { shouldRouteAdaptiveGapToFeynman } from './adaptiveGapRouting';

export type NextActionId = LearningActionId | 'reprocess';

export type NextActionRecommendation = {
  primary: NextActionId;
  reason: string;
  secondary: LearningActionId[];
};

export function recommendNextAction(opts: {
  lang: Lang;
  hasSource: boolean;
  sourceQuality: number | null;
  showMigration: boolean;
  showLowQuality: boolean;
  stepIndex: number;
  stepCount: number;
  stepMark?: 'understood' | 'confusing';
  quizPassed: boolean;
  weakConceptCount: number;
  activeConcept?: string;
  activities?: ActivityItem[];
}): NextActionRecommendation | null {
  const {
    lang,
    hasSource,
    sourceQuality,
    showMigration,
    showLowQuality,
    stepIndex,
    stepCount,
    stepMark,
    quizPassed,
    weakConceptCount,
    activeConcept = '',
    activities = [],
  } = opts;

  const isEl = lang === 'el';
  const secondary = (...ids: LearningActionId[]): LearningActionId[] => ids;

  if (!hasSource) return null;

  if (showMigration || showLowQuality) {
    const q = typeof sourceQuality === 'number' ? sourceQuality : null;
    return {
      primary: 'reprocess',
      reason: showMigration
        ? (isEl
          ? 'Το υλικό αναλύθηκε με παλαιότερο pipeline — οι πίνακες/τύποι μπορεί να είναι λανθασμένοι.'
          : 'Material used an older pipeline — tables and formulas may be wrong.')
        : (isEl
          ? `Χαμηλή ποιότητα πηγής${q != null ? ` (${q}/100)` : ''} — προτείνεται επανεπεξεργασία πριν το κουίζ.`
          : `Low source quality${q != null ? ` (${q}/100)` : ''} — reprocess before relying on quizzes.`),
      secondary: secondary('study-section', 'ask-agent'),
    };
  }

  if (stepMark === 'confusing') {
    return {
      primary: 'explain-zero',
      reason: isEl
        ? 'Σήμανες την ενότητα ως μπερδευτική — ξεκίνα με εξήγηση από το μηδέν.'
        : 'You marked this section confusing — start with an explanation from zero.',
      secondary: secondary('ask-agent', 'mark-understood', 'flashcards'),
    };
  }

  if (quizPassed) {
    return {
      primary: 'flashcards',
      reason: isEl
        ? 'Πέρασες τον έλεγχο γνώσεων — ενίσχυσε με spaced repetition.'
        : 'Knowledge check passed — reinforce with spaced repetition.',
      secondary: secondary('mark-understood', 'ask-agent'),
    };
  }

  if (weakConceptCount > 0 && stepMark === 'understood') {
    return {
      primary: 'test-me',
      reason: isEl
        ? `Έχεις ${weakConceptCount} αδύναμες έννοιες — δοκίμασε την ενότητα.`
        : `You have ${weakConceptCount} weak concepts — test this section.`,
      secondary: secondary('flashcards', 'explain-zero', 'ask-agent'),
    };
  }

  const onQuizStep = stepCount > 0 && stepIndex >= stepCount - 1;
  const gapToFeynman = activeConcept
    ? shouldRouteAdaptiveGapToFeynman(activeConcept, activities)
    : false;

  if (gapToFeynman && !quizPassed) {
    return {
      primary: 'feynman-explain',
      reason: isEl
        ? `3 αποτυχίες στο quiz για «${activeConcept}» — δοκίμασε Feynman εξήγηση.`
        : `Three quiz misses on "${activeConcept}" — try a Feynman explanation.`,
      secondary: secondary('explain-zero', 'ask-agent', 'flashcards'),
    };
  }

  if (onQuizStep && !quizPassed) {
    return {
      primary: 'test-me',
      reason: isEl
        ? 'Έφτασες στον έλεγχο γνώσεων — δοκίμασε την κατανόησή σου.'
        : 'You reached the knowledge check — test your understanding.',
      secondary: secondary('explain-zero', 'flashcards', 'ask-agent'),
    };
  }

  if (stepMark === 'understood') {
    return {
      primary: 'test-me',
      reason: isEl
        ? 'Η ενότητα σημειώθηκε ως κατανοητή — έλεγξε με ερώτηση.'
        : 'Section marked clear — verify with a quick check.',
      secondary: secondary('flashcards', 'ask-agent'),
    };
  }

  return {
    primary: 'study-section',
    reason: isEl
      ? 'Διάβασε πρώτα το κείμενο πηγής σε αυτή την ενότητα.'
      : 'Read the source text for this section first.',
    secondary: secondary('ask-agent', 'mark-confusing', 'explain-zero'),
  };
}

export function nextActionLabel(
  id: NextActionId,
  lang: Lang,
): string {
  if (id === 'reprocess') {
    return lang === 'el' ? 'Προεπισκόπηση επανεπεξεργασίας' : 'Preview reprocess';
  }
  return getLearningActions(lang).find((a) => a.id === id)?.label ?? id;
}
