import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceStep = { title: string; type: string };

const TYPE_PATTERNS: { pattern: RegExp; tools: WorkspaceToolId[] }[] = [
  { pattern: /quiz|κουίζ|knowledge check|έλεγχος/i, tools: ['leitner', 'reader'] },
  { pattern: /practice|εξάσκηση|worked|example|παράδειγμα/i, tools: ['scratchpad', 'whiteboard', 'simulator'] },
  { pattern: /compare|σύγκριση/i, tools: ['compare', 'debate'] },
  { pattern: /deep|εμβάθυνση/i, tools: ['reader', 'feynman'] },
  { pattern: /core|βασικ|concept|έννοια/i, tools: ['concept-map', 'reader'] },
  { pattern: /insight|ιδέα|key/i, tools: ['debate', 'feynman'] },
  { pattern: /link|σύνδεση|retrieval/i, tools: ['concept-map', 'leitner'] },
  { pattern: /misconception|παρανόηση/i, tools: ['debate', 'feynman'] },
  { pattern: /summary|σύνοψη/i, tools: ['reader', 'annotations'] },
];

const ROTATION: WorkspaceToolId[] = ['reader', 'concept-map', 'feynman', 'leitner', 'scratchpad'];

/**
 * Recommend workspace tools for a lesson-rail step (deep-link buttons).
 */
export function recommendToolsForStep(
  step: WorkspaceStep,
  stepIndex: number,
  stepCount: number,
): WorkspaceToolId[] {
  const haystack = `${step.type} ${step.title}`.toLowerCase();
  for (const { pattern, tools } of TYPE_PATTERNS) {
    if (pattern.test(haystack)) return tools;
  }
  if (stepIndex === stepCount - 1) return ['leitner', 'reader'];
  return [ROTATION[stepIndex % ROTATION.length]!, 'reader'];
}

export function stepToolActionLabel(tool: WorkspaceToolId, lang: 'en' | 'el'): string {
  const labels: Record<WorkspaceToolId, { en: string; el: string }> = {
    'concept-map': { en: 'Concept map', el: 'Χάρτης' },
    simulator: { en: 'Sandbox', el: 'Sandbox' },
    leitner: { en: 'Flashcards', el: 'Κάρτες' },
    compare: { en: 'Compare', el: 'Σύγκριση' },
    whiteboard: { en: 'Whiteboard', el: 'Πίνακας' },
    feynman: { en: 'Feynman', el: 'Feynman' },
    timer: { en: 'Timer', el: 'Χρονόμετρο' },
    debate: { en: 'Debate', el: 'Ένστοιχα' },
    reader: { en: 'Reader', el: 'Αναγνώστης' },
    scratchpad: { en: 'Scratchpad', el: 'Τύποι' },
    annotations: { en: 'Annotate', el: 'Σημειώσεις' },
    quiz: { en: 'Quiz', el: 'Κουίζ' },
    dashboard: { en: 'Dashboard', el: 'Ταμπλό' },
  };
  return labels[tool][lang];
}
