/**
 * OPT-AI-A — PathFocus: sync weak/next/selection state into Agent Try chips.
 * Patterns inspired by canvas↔chat sync; Synapse-owned content only.
 */

import type { Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import type { AgentMode } from '../types';

export type PathFocusSource = 'weak-area' | 'quiz-miss' | 'next-action' | 'selection' | 'manual';

export type PathFocus = {
  concept: string;
  reason?: string;
  source: PathFocusSource;
  suggestedTool?: WorkspaceToolId;
  suggestedMode?: AgentMode;
};

export type PathTryChip = {
  id: string;
  label: string;
  prompt: string;
  mode: AgentMode;
  tool?: WorkspaceToolId;
};

export function buildPathTryChips(focus: PathFocus | null | undefined, lang: Lang): PathTryChip[] {
  const concept = focus?.concept?.trim();
  if (!concept) return [];

  const explain: PathTryChip = {
    id: `try-explain-${concept}`,
    label: lang === 'el' ? `Εξήγησε: ${concept}` : `Explain: ${concept}`,
    prompt:
      lang === 'el'
        ? `Εξήγησε απλά την έννοια «${concept}» από τις σημειώσεις μου και δείξε πού μπερδεύομαι.`
        : `Explain "${concept}" simply from my notes and show where I likely get stuck.`,
    mode: focus?.suggestedMode ?? 'beginner',
    tool: 'reader',
  };

  const quiz: PathTryChip = {
    id: `try-quiz-${concept}`,
    label: lang === 'el' ? `Κουίζ: ${concept}` : `Quiz: ${concept}`,
    prompt:
      lang === 'el'
        ? `Κάνε μου 3 σύντομες ερωτήσεις ανάκλησης για «${concept}» από τις σημειώσεις μου (χωρίς να δώσεις πρώτα τις απαντήσεις).`
        : `Give me 3 short retrieval questions on "${concept}" from my notes (don't reveal answers first).`,
    mode: 'error-diagnosis',
    tool: 'quiz',
  };

  const cards: PathTryChip = {
    id: `try-cards-${concept}`,
    label: lang === 'el' ? `Κάρτες: ${concept}` : `Cards: ${concept}`,
    prompt:
      lang === 'el'
        ? `Πρότεινε 3 κάρτες Leitner (εμπρός/πίσω) για «${concept}» από τις σημειώσεις μου.`
        : `Propose 3 Leitner cards (front/back) for "${concept}" from my notes.`,
    mode: 'memory-coach',
    tool: 'leitner',
  };

  if (focus?.source === 'quiz-miss') {
    return [
      {
        id: `try-feynman-${concept}`,
        label: lang === 'el' ? `Feynman: ${concept}` : `Feynman: ${concept}`,
        prompt:
          lang === 'el'
            ? `Έκανα λάθος στο κουίζ για «${concept}». Οδήγησέ με σε Feynman εξήγηση.`
            : `I missed a quiz on "${concept}". Guide me through a Feynman explanation.`,
        mode: 'feynman',
        tool: 'feynman',
      },
      explain,
      cards,
    ];
  }

  return [explain, quiz, cards];
}

export function pathFocusFromWeakArea(concept: string, reason?: string): PathFocus {
  return {
    concept: concept.trim(),
    reason: reason?.trim() || undefined,
    source: 'weak-area',
    suggestedTool: 'reader',
    suggestedMode: 'beginner',
  };
}

export function pathFocusFromQuizMiss(concept: string): PathFocus {
  return {
    concept: concept.trim(),
    source: 'quiz-miss',
    suggestedTool: 'feynman',
    suggestedMode: 'feynman',
  };
}
