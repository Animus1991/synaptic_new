/**
 * §20 per-tool audit spine — shared correlation contract for every workspace tool.
 * Each record documents purpose, entities read/written, and launch readiness.
 */

import type { WorkspaceToolId } from './taskFlows';
import { WORKSPACE_TOOLS } from './workspaceToolRegistry';

export type ToolReadinessLabel =
  | 'launch-ready'
  | 'needs-polish'
  | 'mvp-ready'
  | 'prototype'
  | 'partial';

export type SharedEntity =
  | 'Document'
  | 'ReaderStep'
  | 'Concept'
  | 'ConceptBus'
  | 'ProgressRecord'
  | 'LearningEvent'
  | 'Annotation'
  | 'QuizAttempt'
  | 'FlashcardReview'
  | 'ScratchpadEntry'
  | 'WhiteboardBoard'
  | 'DebateSession'
  | 'ComparisonSession'
  | 'SimulatorSession'
  | 'TimerSession'
  | 'AgentConversation'
  | 'ProcessingVersion';

export type BilingualText = { en: string; el: string };

export type WorkspaceToolS20Record = {
  toolId: WorkspaceToolId;
  /** §20 Q1–2 */
  purpose: BilingualText;
  /** §20 Q3 */
  learnerProblem: BilingualText;
  /** §20 Q5 */
  reads: SharedEntity[];
  /** §20 Q6 */
  writes: SharedEntity[];
  /** §20 Q7 */
  dependsOnTools: WorkspaceToolId[];
  updatesProgress: boolean;
  updatesConceptBus: boolean;
  usesReaderContext: boolean;
  dependsOnDocQuality: boolean;
  safeAfterReprocess: boolean;
  safeAfterDeletion: boolean;
  hasEmptyState: boolean;
  hasLoadingState: boolean;
  hasErrorState: boolean;
  mobileReady: boolean;
  bilingual: boolean;
  hasTests: boolean;
  readiness: ToolReadinessLabel;
  launchBlockers: string[];
};

const spine = (record: WorkspaceToolS20Record): WorkspaceToolS20Record => record;

export const WORKSPACE_TOOL_S20: Record<WorkspaceToolId, WorkspaceToolS20Record> = {
  reader: spine({
    toolId: 'reader',
    purpose: {
      en: 'Read source text aligned to the active workspace step and concept.',
      el: 'Ανάγνωση κειμένου πηγής ευθυγραμμισμένη με το ενεργό βήμα και την έννοια.',
    },
    learnerProblem: {
      en: 'I need to understand the original material before practicing or testing.',
      el: 'Χρειάζομαι να κατανοήσω το πρωτότυπο κείμενο πριν την εξάσκηση ή τον έλεγχο.',
    },
    reads: ['Document', 'ReaderStep', 'Concept', 'ProcessingVersion'],
    writes: ['ConceptBus', 'LearningEvent', 'ProgressRecord'],
    dependsOnTools: [],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  'concept-map': spine({
    toolId: 'concept-map',
    purpose: {
      en: 'Visualize and rearrange concept relationships from the source.',
      el: 'Οπτικοποίηση και αναδιάταξη σχέσεων εννοιών από την πηγή.',
    },
    learnerProblem: {
      en: 'I see facts but not how ideas connect.',
      el: 'Βλέπω δεδομένα αλλά όχι πώς συνδέονται οι ιδέες.',
    },
    reads: ['Document', 'Concept', 'ConceptBus', 'ReaderStep'],
    writes: ['ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: false,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  scratchpad: spine({
    toolId: 'scratchpad',
    purpose: {
      en: 'Draft formulas and step-by-step derivations with SymPy validation.',
      el: 'Πρόχειρες τύποι και βήματα με SymPy validation.',
    },
    learnerProblem: {
      en: 'I need to work through math steps and verify each line.',
      el: 'Χρειάζομαι να δουλέψω βήμα-βήμα τους τύπους και να τους ελέγξω.',
    },
    reads: ['Document', 'Concept', 'ScratchpadEntry'],
    writes: ['ScratchpadEntry', 'ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: false,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  whiteboard: spine({
    toolId: 'whiteboard',
    purpose: {
      en: 'Draw diagrams with Agent coach blueprints tied to the active concept.',
      el: 'Σχέδια με Agent coach blueprints για την ενεργή έννοια.',
    },
    learnerProblem: {
      en: 'I need spatial / visual thinking beyond linear text.',
      el: 'Χρειάζομαι οπτική σκέψη πέρα από γραμμικό κείμενο.',
    },
    reads: ['Concept', 'ConceptBus', 'AgentConversation'],
    writes: ['WhiteboardBoard', 'ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader', 'concept-map'],
    updatesProgress: false,
    updatesConceptBus: true,
    usesReaderContext: false,
    dependsOnDocQuality: false,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  leitner: spine({
    toolId: 'leitner',
    purpose: {
      en: 'Spaced-repetition flashcards grounded in source passages.',
      el: 'Κάρτες spaced repetition από αποσπάσματα πηγής.',
    },
    learnerProblem: {
      en: 'I forget terms and need scheduled retrieval practice.',
      el: 'Ξεχνώ όρους και χρειάζομαι προγραμματισμένη επανάληψη.',
    },
    reads: ['Document', 'Concept', 'FlashcardReview', 'ReaderStep'],
    writes: ['FlashcardReview', 'ConceptBus', 'ProgressRecord', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  feynman: spine({
    toolId: 'feynman',
    purpose: {
      en: 'Explain the concept in plain language and detect gaps.',
      el: 'Εξήγηση έννοιας με απλά λόγια και εντοπισμός κενών.',
    },
    learnerProblem: {
      en: 'I think I understand but cannot explain it simply.',
      el: 'Νομίζω ότι καταλαβαίνω αλλά δεν μπορώ να το εξηγήσω απλά.',
    },
    reads: ['Document', 'Concept', 'AgentConversation'],
    writes: ['LearningEvent', 'ConceptBus', 'ProgressRecord'],
    dependsOnTools: ['reader'],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  quiz: spine({
    toolId: 'quiz',
    purpose: {
      en: 'Active-recall knowledge checks with IRT-aware difficulty.',
      el: 'Έλεγχος γνώσης (active recall) με IRT δυσκολία.',
    },
    learnerProblem: {
      en: 'I need to test whether I truly remember, not just recognize.',
      el: 'Χρειάζομαι να ελέγξω αν θυμάμαι, όχι μόνο να αναγνωρίζω.',
    },
    reads: ['Document', 'Concept', 'QuizAttempt', 'ReaderStep'],
    writes: ['QuizAttempt', 'ConceptBus', 'ProgressRecord', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  simulator: spine({
    toolId: 'simulator',
    purpose: {
      en: 'Exam-style sandbox with sensitivity cues and timer presets.',
      el: 'Προσομοίωση εξέτασης με cues και presets χρονομέτρου.',
    },
    learnerProblem: {
      en: 'I need exam conditions without real stakes.',
      el: 'Χρειάζομαι συνθήκες εξέτασης χωρίς πραγματικό ρίσκο.',
    },
    reads: ['Document', 'Concept', 'SimulatorSession', 'TimerSession'],
    writes: ['SimulatorSession', 'ConceptBus', 'LearningEvent', 'ProgressRecord'],
    dependsOnTools: ['reader', 'timer', 'quiz'],
    updatesProgress: true,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  compare: spine({
    toolId: 'compare',
    purpose: {
      en: 'Side-by-side concept comparison with diff export.',
      el: 'Σύγκριση εννοιών side-by-side με diff export.',
    },
    learnerProblem: {
      en: 'I confuse similar terms and need contrast.',
      el: 'Μπερδεύω παρόμοιους όρους και χρειάζομαι αντίθεση.',
    },
    reads: ['Document', 'Concept', 'ComparisonSession'],
    writes: ['ComparisonSession', 'ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader', 'concept-map'],
    updatesProgress: false,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  debate: spine({
    toolId: 'debate',
    purpose: {
      en: 'Structured argument map with persisted rebuttals.',
      el: 'Χάρτης επιχειρημάτων με persisted rebuttals.',
    },
    learnerProblem: {
      en: 'I need to stress-test my understanding through counter-arguments.',
      el: 'Χρειάζομαι να δοκιμάσω την κατανόησή μου με αντεπιχειρήματα.',
    },
    reads: ['Document', 'Concept', 'DebateSession'],
    writes: ['DebateSession', 'ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: false,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  timer: spine({
    toolId: 'timer',
    purpose: {
      en: 'Pomodoro / exam countdown synced with simulator presets.',
      el: 'Pomodoro / αντίστροφη εξέτασης συγχρονισμένα με simulator.',
    },
    learnerProblem: {
      en: 'I lose focus or misjudge exam pacing.',
      el: 'Χάνω την εστίαση ή υποτιμώ τον χρόνο στην εξέταση.',
    },
    reads: ['Concept', 'TimerSession', 'ProgressRecord'],
    writes: ['TimerSession', 'LearningEvent', 'ProgressRecord'],
    dependsOnTools: ['simulator'],
    updatesProgress: true,
    updatesConceptBus: false,
    usesReaderContext: false,
    dependsOnDocQuality: false,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: false,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  annotations: spine({
    toolId: 'annotations',
    purpose: {
      en: 'Highlight and annotate source with reprocess anchor remap.',
      el: 'Highlight και σχόλια με reprocess anchor remap.',
    },
    learnerProblem: {
      en: 'I need to mark confusing or exam-critical passages.',
      el: 'Χρειάζομαι να σημειώσω μπερδεμένα ή κρίσιμα σημεία.',
    },
    reads: ['Document', 'Annotation', 'ReaderStep', 'ProcessingVersion'],
    writes: ['Annotation', 'ConceptBus', 'LearningEvent'],
    dependsOnTools: ['reader'],
    updatesProgress: false,
    updatesConceptBus: true,
    usesReaderContext: true,
    dependsOnDocQuality: true,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: true,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
  dashboard: spine({
    toolId: 'dashboard',
    purpose: {
      en: 'In-workspace mastery, activity breakdown, and session export.',
      el: 'Mastery, δραστηριότητα και export συνεδρίας μέσα στο workspace.',
    },
    learnerProblem: {
      en: 'I need to see whether my study session actually moved the needle.',
      el: 'Χρειάζομαι να δω αν η συνεδρία μελέτης άλλαξε κάτι.',
    },
    reads: ['ProgressRecord', 'ConceptBus', 'LearningEvent', 'Concept'],
    writes: ['ProgressRecord', 'LearningEvent'],
    dependsOnTools: ['reader', 'quiz', 'leitner'],
    updatesProgress: true,
    updatesConceptBus: false,
    usesReaderContext: false,
    dependsOnDocQuality: false,
    safeAfterReprocess: true,
    safeAfterDeletion: true,
    hasEmptyState: true,
    hasLoadingState: true,
    hasErrorState: false,
    mobileReady: true,
    bilingual: true,
    hasTests: true,
    readiness: 'launch-ready',
    launchBlockers: [],
  }),
};

export function getToolS20(toolId: WorkspaceToolId): WorkspaceToolS20Record {
  return WORKSPACE_TOOL_S20[toolId];
}

export function toolLearnerProblem(toolId: WorkspaceToolId, lang: 'en' | 'el'): string {
  const record = getToolS20(toolId);
  return lang === 'el' ? record.learnerProblem.el : record.learnerProblem.en;
}

export function toolPurposeLine(toolId: WorkspaceToolId, lang: 'en' | 'el'): string {
  const record = getToolS20(toolId);
  return lang === 'el' ? record.purpose.el : record.purpose.en;
}

export function listToolsByReadiness(label: ToolReadinessLabel): WorkspaceToolId[] {
  return WORKSPACE_TOOLS
    .map((t) => t.id)
    .filter((id) => WORKSPACE_TOOL_S20[id].readiness === label);
}

export function toolLaunchBlockers(toolId: WorkspaceToolId): string[] {
  return WORKSPACE_TOOL_S20[toolId].launchBlockers;
}

export function allWorkspaceToolsAudited(): boolean {
  return WORKSPACE_TOOLS.every((t) => WORKSPACE_TOOL_S20[t.id] != null);
}

export function toolsSharingEntity(entity: SharedEntity): WorkspaceToolId[] {
  return WORKSPACE_TOOLS
    .map((t) => t.id)
    .filter((id) => {
      const r = WORKSPACE_TOOL_S20[id];
      return r.reads.includes(entity) || r.writes.includes(entity);
    });
}
