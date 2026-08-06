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
      en: 'Read your notes for this step — highlight terms and jump sections as you go.',
      el: 'Διάβασε τις σημειώσεις για αυτό το βήμα — επισήμανε όρους και άλλαξε ενότητες καθώς προχωράς.',
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
      en: 'See how ideas connect — drag them around, then tap one to focus your study.',
      el: 'Δες πώς συνδέονται οι ιδέες — σύρε τις, πάτα μία για να εστιάσεις τη μελέτη σου.',
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
      en: 'Try a formula, fill in the numbers, and check each step as you go.',
      el: 'Δοκίμασε έναν τύπο, βάλε τιμές και έλεγξε κάθε βήμα στην πορεία.',
    },
    learnerProblem: {
      en: 'I want to work through the math without getting stuck on a wrong line.',
      el: 'Θέλω να λύσω τα μαθηματικά χωρίς να κολλήσω σε λάθος γραμμή.',
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
      en: 'Sketch the idea by hand — drop labels from your notes, then check what is still missing.',
      el: 'Σκίτσαρε την ιδέα με το χέρι — βάλε ετικέτες από τις σημειώσεις και δες τι λείπει ακόμη.',
    },
    learnerProblem: {
      en: 'I understand better when I can draw it out.',
      el: 'Καταλαβαίνω καλύτερα όταν το σχεδιάζω.',
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
      en: 'Flip a card, say the answer, then rate how well you remembered it.',
      el: 'Γύρισε την κάρτα, πες την απάντηση, και βαθμολόγησε πόσο καλά τη θυμήθηκες.',
    },
    learnerProblem: {
      en: 'I forget key terms and need a gentle daily review habit.',
      el: 'Ξεχνώ βασικούς όρους και χρειάζομαι μια ήπια καθημερινή επανάληψη.',
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
      en: 'Teach it in plain words — then see what still needs filling in.',
      el: 'Δίδαξέ το με απλά λόγια — και δες τι ακόμα λείπει.',
    },
    learnerProblem: {
      en: 'I think I get it, but I freeze when I try to explain it simply.',
      el: 'Νομίζω ότι το πιάνω, αλλά κολλάω όταν πρέπει να το πω απλά.',
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
      en: 'Quick questions from your notes — see what sticks and what to review.',
      el: 'Γρήγορες ερωτήσεις από τις σημειώσεις σου — δες τι μένει και τι να ξαναδείς.',
    },
    learnerProblem: {
      en: 'I need to check what I can recall, not only what looks familiar.',
      el: 'Θέλω να ελέγξω τι μπορώ να ανακαλέσω, όχι μόνο τι μου φαίνεται οικείο.',
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
      en: 'Move the sliders, watch the graph change, then practice under a timer.',
      el: 'Κούνα τους διακόπτες, δες το γράφημα, μετά εξάσκηση με χρονόμετρο.',
    },
    learnerProblem: {
      en: 'I want to try what-if scenarios without real exam stress.',
      el: 'Θέλω να δοκιμάσω σενάρια χωρίς άγχος πραγματικής εξέτασης.',
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
      en: 'See two ideas side by side — spot what actually differs.',
      el: 'Δες δύο ιδέες δίπλα-δίπλα — βρες τι πραγματικά διαφέρει.',
    },
    learnerProblem: {
      en: 'I mix up similar terms and need a clear contrast.',
      el: 'Μπερδεύω παρόμοιους όρους και θέλω καθαρή αντίθεση.',
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
      en: 'Map claims for and against — write your reply and keep it.',
      el: 'Χάρτης ισχυρισμών υπέρ και κατά — γράψε την απάντησή σου και κράτα την.',
    },
    learnerProblem: {
      en: 'I want to test my understanding against a real counter-argument.',
      el: 'Θέλω να δοκιμάσω την κατανόησή μου απέναντι σε πραγματικό αντίλογο.',
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
      en: 'Focus now, or count down to your exam — pick a block and start.',
      el: 'Εστίασε τώρα, ή μέτρα αντίστροφα μέχρι την εξέταση — διάλεξε μπλοκ και ξεκίνα.',
    },
    learnerProblem: {
      en: 'I lose focus or misjudge how long I have before the exam.',
      el: 'Χάνω την εστίαση ή δεν υπολογίζω σωστά τον χρόνο μέχρι την εξέταση.',
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
      en: 'Mark what matters in your notes — highlights, comments, and pins.',
      el: 'Σημείωσε τι μετράει στις σημειώσεις — επισημάνσεις, σχόλια και pins.',
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
      en: 'See how today went — readiness, weak spots, and what to do next.',
      el: 'Δες πώς πήγε σήμερα — ετοιμότητα, αδύναμα σημεία και τι να κάνεις μετά.',
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
