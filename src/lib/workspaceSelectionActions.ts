/**
 * §13.5 Unified selection-action contract — same affordances in every tool surface.
 */

import type { Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceSelectionActionId =
  | 'annotate'
  | 'ask-agent'
  | 'make-card'
  | 'quiz'
  | 'compare'
  | 'debate'
  | 'scratchpad'
  | 'open-reader';

export type WorkspaceSelectionContext = {
  /** Selected passage or concept label. */
  text: string;
  /** Active concept for correlation bus. */
  term: string;
  sectionLabel?: string;
  originTool: WorkspaceToolId;
};

export type SelectionActionDef = {
  id: WorkspaceSelectionActionId;
  label: string;
  hint: string;
  /** Hide when already on Reader and action is open-reader. */
  hideOnReader?: boolean;
  /** Hide when already on Quiz and action is quiz. */
  hideOnQuiz?: boolean;
};

const EN: Record<WorkspaceSelectionActionId, Omit<SelectionActionDef, 'id'>> = {
  annotate: { label: 'Annotate', hint: 'Highlight on source text' },
  'ask-agent': { label: 'Ask Agent', hint: 'Contextual tutor for this passage' },
  'make-card': { label: 'Make card', hint: 'Add to Leitner deck' },
  quiz: { label: 'Quiz', hint: 'Test this passage', hideOnQuiz: true },
  compare: { label: 'Compare', hint: 'Side-by-side with related concept' },
  debate: { label: 'Debate', hint: 'Argument map for this claim' },
  scratchpad: { label: 'Scratchpad', hint: 'Draft notes or formulas' },
  'open-reader': { label: 'Open in Reader', hint: 'Jump to source passage', hideOnReader: true },
};

const EL: Record<WorkspaceSelectionActionId, Omit<SelectionActionDef, 'id'>> = {
  annotate: { label: 'Επισήμανση', hint: 'Επισήμανση στο κείμενο πηγής' },
  'ask-agent': { label: 'Ρώτα Agent', hint: 'Tutor για αυτό το απόσπασμα' },
  'make-card': { label: 'Κάρτα', hint: 'Προσθήκη στο Leitner' },
  quiz: { label: 'Κουίζ', hint: 'Έλεγχος για αυτό το απόσπασμα', hideOnQuiz: true },
  compare: { label: 'Σύγκριση', hint: 'Παράλληλα με σχετική έννοια' },
  debate: { label: 'Συζήτηση', hint: 'Χάρτης επιχειρήματος' },
  scratchpad: { label: 'Πρόχειρο', hint: 'Πρόχειρες σημειώσεις' },
  'open-reader': { label: 'Άνοιγμα στο Reader', hint: 'Μετάβαση στην πηγή', hideOnReader: true },
};

export const SELECTION_ACTION_ORDER: WorkspaceSelectionActionId[] = [
  'annotate',
  'ask-agent',
  'make-card',
  'quiz',
  'compare',
  'debate',
  'scratchpad',
  'open-reader',
];

export function getSelectionActionDefs(
  lang: Lang,
  originTool: WorkspaceToolId,
): SelectionActionDef[] {
  const table = lang === 'el' ? EL : EN;
  return SELECTION_ACTION_ORDER
    .map((id) => ({ id, ...table[id] }))
    .filter((def) => {
      if (originTool === 'reader' && def.hideOnReader) return false;
      if (originTool === 'quiz' && def.hideOnQuiz) return false;
      return true;
    });
}

export function buildSelectionAgentPrompt(
  text: string,
  sectionLabel: string | undefined,
  concept: string,
  lang: Lang,
): string {
  const excerpt = text.trim().slice(0, 600);
  const section = sectionLabel?.trim() || concept;
  if (lang === 'el') {
    return `Εξήγησε από τις σημειώσεις μου (ενότητα «${section}», έννοια: ${concept}):\n\n«${excerpt}»`;
  }
  return `Explain this from my notes (section "${section}", concept: ${concept}):\n\n"${excerpt}"`;
}

export function buildSelectionFlashcard(
  text: string,
  concept: string,
  glossaryDefinition?: string,
): { front: string; back: string; cardType: 'definition' | 'term' } {
  const front = text.trim().slice(0, 120);
  const back = glossaryDefinition?.trim() || concept;
  return {
    front,
    back,
    cardType: glossaryDefinition?.trim() ? 'definition' : 'term',
  };
}

export function selectionExcerptPreview(text: string, max = 72): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}
