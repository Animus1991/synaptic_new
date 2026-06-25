/**
 * ┬π20 per-tool audit spine έΑΦ shared correlation contract for every workspace tool.
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
  /** ┬π20 Q1έΑΥ2 */
  purpose: BilingualText;
  /** ┬π20 Q3 */
  learnerProblem: BilingualText;
  /** ┬π20 Q5 */
  reads: SharedEntity[];
  /** ┬π20 Q6 */
  writes: SharedEntity[];
  /** ┬π20 Q7 */
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
      el: '╬Σ╬╜╬υ╬│╬╜╧Κ╧Δ╬╖ ╬║╬╡╬╣╬╝╬φ╬╜╬┐╧Ζ ╧Α╬╖╬│╬χ╧Γ ╬╡╧Ζ╬╕╧Ζ╬│╧Β╬▒╬╝╬╝╬╣╧Δ╬╝╬φ╬╜╬╖ ╬╝╬╡ ╧Ε╬┐ ╬╡╬╜╬╡╧Β╬│╧Ν ╬▓╬χ╬╝╬▒ ╬║╬▒╬╣ ╧Ε╬╖╬╜ ╬φ╬╜╬╜╬┐╬╣╬▒.',
    },
    learnerProblem: {
      en: 'I need to understand the original material before practicing or testing.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╬║╬▒╧Ε╬▒╬╜╬┐╬χ╧Δ╧Κ ╧Ε╬┐ ╧Α╧Β╧Κ╧Ε╧Ν╧Ε╧Ζ╧Α╬┐ ╬║╬╡╬ψ╬╝╬╡╬╜╬┐ ╧Α╧Β╬╣╬╜ ╧Ε╬╖╬╜ ╬╡╬╛╬υ╧Δ╬║╬╖╧Δ╬╖ ╬χ ╧Ε╬┐╬╜ ╬φ╬╗╬╡╬│╧Θ╬┐.',
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
      el: '╬θ╧Α╧Ε╬╣╬║╬┐╧Α╬┐╬ψ╬╖╧Δ╬╖ ╬║╬▒╬╣ ╬▒╬╜╬▒╬┤╬╣╬υ╧Ε╬▒╬╛╬╖ ╧Δ╧Θ╬φ╧Δ╬╡╧Κ╬╜ ╬╡╬╜╬╜╬┐╬╣╧Ο╬╜ ╬▒╧Α╧Ν ╧Ε╬╖╬╜ ╧Α╬╖╬│╬χ.',
    },
    learnerProblem: {
      en: 'I see facts but not how ideas connect.',
      el: '╬Τ╬╗╬φ╧Α╧Κ ╬┤╬╡╬┤╬┐╬╝╬φ╬╜╬▒ ╬▒╬╗╬╗╬υ ╧Ν╧Θ╬╣ ╧Α╧Ο╧Γ ╧Δ╧Ζ╬╜╬┤╬φ╬┐╬╜╧Ε╬▒╬╣ ╬┐╬╣ ╬╣╬┤╬φ╬╡╧Γ.',
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
      el: '╬ι╧Β╧Ν╧Θ╬╡╬╣╧Β╬╡╧Γ ╧Ε╧Ξ╧Α╬┐╬╣ ╬║╬▒╬╣ ╬▓╬χ╬╝╬▒╧Ε╬▒ ╬╝╬╡ SymPy validation.',
    },
    learnerProblem: {
      en: 'I need to work through math steps and verify each line.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╬┤╬┐╧Ζ╬╗╬φ╧Ι╧Κ ╬▓╬χ╬╝╬▒-╬▓╬χ╬╝╬▒ ╧Ε╬┐╧Ζ╧Γ ╧Ε╧Ξ╧Α╬┐╧Ζ╧Γ ╬║╬▒╬╣ ╬╜╬▒ ╧Ε╬┐╧Ζ╧Γ ╬╡╬╗╬φ╬│╬╛╧Κ.',
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
      el: '╬μ╧Θ╬φ╬┤╬╣╬▒ ╬╝╬╡ Agent coach blueprints ╬│╬╣╬▒ ╧Ε╬╖╬╜ ╬╡╬╜╬╡╧Β╬│╬χ ╬φ╬╜╬╜╬┐╬╣╬▒.',
    },
    learnerProblem: {
      en: 'I need spatial / visual thinking beyond linear text.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬┐╧Α╧Ε╬╣╬║╬χ ╧Δ╬║╬φ╧Ι╬╖ ╧Α╬φ╧Β╬▒ ╬▒╧Α╧Ν ╬│╧Β╬▒╬╝╬╝╬╣╬║╧Ν ╬║╬╡╬ψ╬╝╬╡╬╜╬┐.',
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
      el: '╬γ╬υ╧Β╧Ε╬╡╧Γ spaced repetition ╬▒╧Α╧Ν ╬▒╧Α╬┐╧Δ╧Α╬υ╧Δ╬╝╬▒╧Ε╬▒ ╧Α╬╖╬│╬χ╧Γ.',
    },
    learnerProblem: {
      en: 'I forget terms and need scheduled retrieval practice.',
      el: '╬η╬╡╧Θ╬╜╧Ο ╧Ν╧Β╬┐╧Ζ╧Γ ╬║╬▒╬╣ ╧Θ╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╧Α╧Β╬┐╬│╧Β╬▒╬╝╬╝╬▒╧Ε╬╣╧Δ╬╝╬φ╬╜╬╖ ╬╡╧Α╬▒╬╜╬υ╬╗╬╖╧Ι╬╖.',
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
      el: '╬Χ╬╛╬χ╬│╬╖╧Δ╬╖ ╬φ╬╜╬╜╬┐╬╣╬▒╧Γ ╬╝╬╡ ╬▒╧Α╬╗╬υ ╬╗╧Ν╬│╬╣╬▒ ╬║╬▒╬╣ ╬╡╬╜╧Ε╬┐╧Α╬╣╧Δ╬╝╧Ν╧Γ ╬║╬╡╬╜╧Ο╬╜.',
    },
    learnerProblem: {
      en: 'I think I understand but cannot explain it simply.',
      el: '╬ζ╬┐╬╝╬ψ╬╢╧Κ ╧Ν╧Ε╬╣ ╬║╬▒╧Ε╬▒╬╗╬▒╬▓╬▒╬ψ╬╜╧Κ ╬▒╬╗╬╗╬υ ╬┤╬╡╬╜ ╬╝╧Α╬┐╧Β╧Ο ╬╜╬▒ ╧Ε╬┐ ╬╡╬╛╬╖╬│╬χ╧Δ╧Κ ╬▒╧Α╬╗╬υ.',
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
      el: '╬Ι╬╗╬╡╬│╧Θ╬┐╧Γ ╬│╬╜╧Ο╧Δ╬╖╧Γ (active recall) ╬╝╬╡ IRT ╬┤╧Ζ╧Δ╬║╬┐╬╗╬ψ╬▒.',
    },
    learnerProblem: {
      en: 'I need to test whether I truly remember, not just recognize.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╬╡╬╗╬φ╬│╬╛╧Κ ╬▒╬╜ ╬╕╧Ζ╬╝╬υ╬╝╬▒╬╣, ╧Ν╧Θ╬╣ ╬╝╧Ν╬╜╬┐ ╬╜╬▒ ╬▒╬╜╬▒╬│╬╜╧Κ╧Β╬ψ╬╢╧Κ.',
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
      el: '╬ι╧Β╬┐╧Δ╬┐╬╝╬┐╬ψ╧Κ╧Δ╬╖ ╬╡╬╛╬φ╧Ε╬▒╧Δ╬╖╧Γ ╬╝╬╡ cues ╬║╬▒╬╣ presets ╧Θ╧Β╬┐╬╜╬┐╬╝╬φ╧Ε╧Β╬┐╧Ζ.',
    },
    learnerProblem: {
      en: 'I need exam conditions without real stakes.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╧Δ╧Ζ╬╜╬╕╬χ╬║╬╡╧Γ ╬╡╬╛╬φ╧Ε╬▒╧Δ╬╖╧Γ ╧Θ╧Κ╧Β╬ψ╧Γ ╧Α╧Β╬▒╬│╬╝╬▒╧Ε╬╣╬║╧Ν ╧Β╬ψ╧Δ╬║╬┐.',
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
      el: '╬μ╧Ξ╬│╬║╧Β╬╣╧Δ╬╖ ╬╡╬╜╬╜╬┐╬╣╧Ο╬╜ side-by-side ╬╝╬╡ diff export.',
    },
    learnerProblem: {
      en: 'I confuse similar terms and need contrast.',
      el: '╬ε╧Α╬╡╧Β╬┤╬╡╧Ξ╧Κ ╧Α╬▒╧Β╧Ν╬╝╬┐╬╣╬┐╧Ζ╧Γ ╧Ν╧Β╬┐╧Ζ╧Γ ╬║╬▒╬╣ ╧Θ╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬▒╬╜╧Ε╬ψ╬╕╬╡╧Δ╬╖.',
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
      el: '╬π╬υ╧Β╧Ε╬╖╧Γ ╬╡╧Α╬╣╧Θ╬╡╬╣╧Β╬╖╬╝╬υ╧Ε╧Κ╬╜ ╬╝╬╡ persisted rebuttals.',
    },
    learnerProblem: {
      en: 'I need to stress-test my understanding through counter-arguments.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╬┤╬┐╬║╬╣╬╝╬υ╧Δ╧Κ ╧Ε╬╖╬╜ ╬║╬▒╧Ε╬▒╬╜╧Ν╬╖╧Δ╬χ ╬╝╬┐╧Ζ ╬╝╬╡ ╬▒╬╜╧Ε╬╡╧Α╬╣╧Θ╬╡╬╣╧Β╬χ╬╝╬▒╧Ε╬▒.',
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
      el: 'Pomodoro / ╬▒╬╜╧Ε╬ψ╧Δ╧Ε╧Β╬┐╧Η╬╖ ╬╡╬╛╬φ╧Ε╬▒╧Δ╬╖╧Γ ╧Δ╧Ζ╬│╧Θ╧Β╬┐╬╜╬╣╧Δ╬╝╬φ╬╜╬▒ ╬╝╬╡ simulator.',
    },
    learnerProblem: {
      en: 'I lose focus or misjudge exam pacing.',
      el: '╬π╬υ╬╜╧Κ ╧Ε╬╖╬╜ ╬╡╧Δ╧Ε╬ψ╬▒╧Δ╬╖ ╬χ ╧Ζ╧Α╬┐╧Ε╬╣╬╝╧Ο ╧Ε╬┐╬╜ ╧Θ╧Β╧Ν╬╜╬┐ ╧Δ╧Ε╬╖╬╜ ╬╡╬╛╬φ╧Ε╬▒╧Δ╬╖.',
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
      el: 'Highlight ╬║╬▒╬╣ ╧Δ╧Θ╧Ν╬╗╬╣╬▒ ╬╝╬╡ reprocess anchor remap.',
    },
    learnerProblem: {
      en: 'I need to mark confusing or exam-critical passages.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╧Δ╬╖╬╝╬╡╬╣╧Ο╧Δ╧Κ ╬╝╧Α╬╡╧Β╬┤╬╡╬╝╬φ╬╜╬▒ ╬χ ╬║╧Β╬ψ╧Δ╬╣╬╝╬▒ ╧Δ╬╖╬╝╬╡╬ψ╬▒.',
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
      el: 'Mastery, ╬┤╧Β╬▒╧Δ╧Ε╬╖╧Β╬╣╧Ν╧Ε╬╖╧Ε╬▒ ╬║╬▒╬╣ export ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒╧Γ ╬╝╬φ╧Δ╬▒ ╧Δ╧Ε╬┐ workspace.',
    },
    learnerProblem: {
      en: 'I need to see whether my study session actually moved the needle.',
      el: '╬π╧Β╬╡╬╣╬υ╬╢╬┐╬╝╬▒╬╣ ╬╜╬▒ ╬┤╧Κ ╬▒╬╜ ╬╖ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒ ╬╝╬╡╬╗╬φ╧Ε╬╖╧Γ ╬υ╬╗╬╗╬▒╬╛╬╡ ╬║╬υ╧Ε╬╣.',
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
