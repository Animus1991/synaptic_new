import type { ConceptLensAction } from './conceptGraphModel';
import type { WorkspaceToolId } from './taskFlows';
import type { ConceptSignal } from './workspaceConceptBus';
import type { Lang } from './i18n';

type Bilingual = { en: string; el: string };

/** Compact tool names for concept bus / lens rails. */
export const WORKSPACE_TOOL_SHORT_LABELS: Record<WorkspaceToolId, Bilingual> = {
  'concept-map': { en: 'Map', el: 'Χάρτης' },
  reader: { en: 'Reader', el: 'Ανάγνωση' },
  leitner: { en: 'Leitner', el: 'Κάρτες' },
  quiz: { en: 'Quiz', el: 'Κουίζ' },
  feynman: { en: 'Feynman', el: 'Feynman' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  simulator: { en: 'Sandbox', el: 'Προσομοίωση' },
  scratchpad: { en: 'Scratch', el: 'Πρόχειρο' },
  whiteboard: { en: 'Board', el: 'Πίνακας' },
  debate: { en: 'Debate', el: 'Συζήτηση' },
  timer: { en: 'Timer', el: 'Χρόνος' },
  annotations: { en: 'Notes', el: 'Σχόλια' },
  dashboard: { en: 'Stats', el: 'Στατιστ.' },
};

export const CONCEPT_SIGNAL_SHORT_LABELS: Record<ConceptSignal, Bilingual> = {
  focus: { en: 'focus', el: 'εστίαση' },
  read: { en: 'read', el: 'ανάγνωση' },
  mapped: { en: 'mapped', el: 'χάρτης' },
  noted: { en: 'noted', el: 'σημείωση' },
  annotated: { en: 'highlight', el: 'επισήμανση' },
  explained: { en: 'explained', el: 'εξήγηση' },
  simulated: { en: 'simulated', el: 'προσομοίωση' },
  'quiz-correct': { en: 'quiz ✓', el: 'κουίζ ✓' },
  'quiz-wrong': { en: 'quiz ✗', el: 'κουίζ ✗' },
  'leitner-easy': { en: 'easy', el: 'εύκολο' },
  'leitner-hard': { en: 'hard', el: 'δύσκολο' },
  'annotated-confusing': { en: 'confusing', el: 'μπερδεμένο' },
  'annotated-exam': { en: 'exam', el: 'εξέταση' },
};

export const CONCEPT_LENS_ACTION_LABELS: Record<ConceptLensAction, Bilingual> = {
  explain: { en: 'Explain', el: 'Εξήγηση' },
  quiz: { en: 'Quiz', el: 'Κουίζ' },
  flashcards: { en: 'Cards', el: 'Κάρτες' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  debate: { en: 'Debate', el: 'Συζήτηση' },
  feynman: { en: 'Feynman', el: 'Feynman' },
  'mark-confusing': { en: 'Confusing', el: 'Μπερδευτικό' },
  'mark-mastered': { en: 'Mastered', el: 'Κατάλαβα' },
  'open-reader': { en: 'Reader', el: 'Ανάγνωση' },
};

export function bilingualLabel(map: Bilingual, lang: Lang): string {
  return map[lang];
}
