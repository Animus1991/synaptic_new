/**
 * Wave 3A — per-concept remediation matrix from Concept Bus signals.
 */

import type { Lang } from './i18n';
import type { ConceptBusRow } from './conceptBusPanelModel';
import type { ConceptSignal } from './workspaceConceptBus';

export type ConceptRemediationId =
  | 'reader'
  | 'quiz'
  | 'flashcards'
  | 'feynman'
  | 'explain'
  | 'compare'
  | 'ask-agent';

export type ConceptRemediationAction = {
  id: ConceptRemediationId;
  label: string;
  hint: string;
};

const COPY: Record<ConceptRemediationId, { en: { label: string; hint: string }; el: { label: string; hint: string } }> = {
  reader: {
    en: { label: 'Reader', hint: 'Re-read source for this term' },
    el: { label: 'Reader', hint: 'Επανάληψη στην πηγή' },
  },
  quiz: {
    en: { label: 'Quiz', hint: 'Retest this concept' },
    el: { label: 'Κουίζ', hint: 'Επανέλεγχος έννοιας' },
  },
  flashcards: {
    en: { label: 'Cards', hint: 'Spaced repetition deck' },
    el: { label: 'Κάρτες', hint: 'Leitner επανάληψη' },
  },
  feynman: {
    en: { label: 'Feynman', hint: 'Explain in your own words' },
    el: { label: 'Feynman', hint: 'Εξήγησε με δικά σου λόγια' },
  },
  explain: {
    en: { label: 'Explain', hint: 'Agent explains from zero' },
    el: { label: 'Εξήγηση', hint: 'Agent από το μηδέν' },
  },
  compare: {
    en: { label: 'Compare', hint: 'Side-by-side related terms' },
    el: { label: 'Σύγκριση', hint: 'Παράλληλη σύγκριση όρων' },
  },
  'ask-agent': {
    en: { label: 'Agent', hint: 'Contextual tutor for this term' },
    el: { label: 'Agent', hint: 'Tutor για αυτόν τον όρο' },
  },
};

function countSignal(signals: ConceptSignal[], signal: ConceptSignal): number {
  return signals.filter((s) => s === signal).length;
}

function toAction(id: ConceptRemediationId, lang: Lang): ConceptRemediationAction {
  const table = COPY[id][lang];
  return { id, label: table.label, hint: table.hint };
}

/** Ranked remediation actions for a concept bus row (max 4). */
export function buildConceptRemediationMatrix(
  row: ConceptBusRow,
  lang: Lang,
): ConceptRemediationAction[] {
  const scores = new Map<ConceptRemediationId, number>();
  const bump = (id: ConceptRemediationId, score: number) => {
    scores.set(id, Math.max(scores.get(id) ?? 0, score));
  };

  const { signals } = row;
  const quizWrong = countSignal(signals, 'quiz-wrong');
  const leitnerHard = countSignal(signals, 'leitner-hard');
  const confusing = countSignal(signals, 'annotated-confusing');

  if (quizWrong > 0) {
    bump('quiz', 100 + quizWrong * 5);
    bump('flashcards', 92);
    bump('feynman', 88);
  }
  if (leitnerHard > 0) {
    bump('flashcards', 96);
    bump('quiz', 75);
    bump('feynman', 70);
  }
  if (confusing > 0) {
    bump('explain', 90);
    bump('reader', 82);
    bump('ask-agent', 78);
  }
  if (row.struggling && scores.size === 0) {
    bump('explain', 65);
    bump('quiz', 60);
    bump('flashcards', 55);
  }
  if (row.confident && !row.struggling) {
    bump('flashcards', 50);
  }

  bump('reader', 40);
  bump('ask-agent', 35);
  if (row.tools.includes('compare') || quizWrong > 0) {
    bump('compare', 45);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => toAction(id, lang));
}
