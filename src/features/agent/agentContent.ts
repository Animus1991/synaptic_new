import type { AgentMode, UserSettings } from '../../types';
import type { Lang } from '../../lib/i18n';

export type AgentModeCopy = { label: string; desc: string };

export type AgentSourceModeOption = {
  id: UserSettings['sourceMode'];
  label: string;
  desc: string;
};

export type AgentUiCopy = {
  title: string;
  llmConnected: string;
  offlineMode: string;
  sourceAttached: string;
  allSources: string;
  focus: string;
  completeTask: string;
  agentModeHeading: string;
  tutorModeHeading: string;
  sourceModeHeading: string;
  quickActionsHeading: string;
  thinking: string;
  inputPlaceholder: string;
  sourceGroundedBadge: string;
  modeSuffix: string;
  noAnswerHint: string;
  sourceOn: string;
  sourceOff: string;
  shiftEnter: string;
  citationSingular: string;
  citationPlural: string;
  citationToggle: string;
  groundingVerified: string;
  groundingWarning: string;
  faithfulnessScore: string;
  ungroundedClaimsHeading: string;
  viewSourceForClaim: string;
  lowConfidence: string;
  badgeSourceGrounded: string;
  badgeAiInference: string;
  badgeEnrichment: string;
  badgeGlobalRag: string;
  badgeGraphRag: string;
  badgeLocalRag: string;
  badgeLowRetrieval: string;
  pinnedFileLabel: string;
  sourceSettingsTitle: string;
  attachFileTitle: string;
  noAnalyzedFiles: string;
  sourceModeFooter: (mode: UserSettings['sourceMode']) => string;
};

export type AgentContent = {
  modes: Record<AgentMode, AgentModeCopy>;
  sourceModes: AgentSourceModeOption[];
  quickActions: string[];
  contextualPrompts: {
    emptySuggestionsHeading: string;
    fromNextAction: (label: string, reason: string) => string;
    fromWeakArea: (concept: string) => string;
    fromTask: (title: string) => string;
  };
  ui: AgentUiCopy;
};

const EN: AgentContent = {
  modes: {
    socratic: { label: 'Socratic Tutor', desc: 'Guided questioning' },
    direct: { label: 'Direct Explain', desc: 'Clear explanations' },
    beginner: { label: 'Beginner', desc: 'No prior knowledge' },
    'exam-coach': { label: 'Exam Coach', desc: 'Exam-focused prep' },
    'deep-theory': { label: 'Deep Theory', desc: 'Rigorous analysis' },
    practical: { label: 'Practical', desc: 'Exercises & code' },
    'error-diagnosis': { label: 'Error Diagnosis', desc: 'Analyze mistakes' },
    feynman: { label: 'Feynman', desc: 'Explain to learn' },
    debate: { label: 'Debate', desc: 'Critical discussion' },
    'oral-exam': { label: 'Oral Exam', desc: 'Professor simulation' },
    'math-tutor': { label: 'Math Tutor', desc: 'Step-by-step math' },
    'coding-tutor': { label: 'Coding Tutor', desc: 'Interactive code' },
    'writing-coach': { label: 'Writing Coach', desc: 'Essay structure' },
    'memory-coach': { label: 'Memory Coach', desc: 'Retrieval practice' },
    motivation: { label: 'Focus Coach', desc: 'Small actionable steps' },
  },
  sourceModes: [
    { id: 'strict', label: 'My Notes Only', desc: 'Answers stay inside your uploads — no outside knowledge' },
    { id: 'enriched', label: 'Notes + Enrichment', desc: 'AI adds trusted context when helpful' },
    { id: 'notes-only', label: 'Notes Structure Only', desc: 'Outline and headings from your uploads' },
  ],
  quickActions: [
    'Explain this concept simply',
    'Give me a practice question',
    'Where does this come from in my notes?',
    'What are common mistakes here?',
    'Create flashcards for this topic',
    'Simulate an exam question',
    'Synthesize across my library',
  ],
  contextualPrompts: {
    emptySuggestionsHeading: 'Suggested starting points',
    fromNextAction: (label, reason) => `Help me with my next step: ${label}. ${reason}`,
    fromWeakArea: (concept) => `Explain why I keep missing ${concept} and how to fix it`,
    fromTask: (title) => `Walk me through "${title}" step by step`,
  },
  ui: {
    title: 'Synapse Agent',
    llmConnected: 'Ready · answers stream as they write',
    offlineMode: 'Offline · Add an API key in Settings',
    sourceAttached: ' · your notes are attached',
    allSources: 'All Sources',
    focus: 'Focus',
    completeTask: 'Complete task',
    agentModeHeading: 'Tutor style',
    tutorModeHeading: 'Tutor Mode',
    sourceModeHeading: 'Source Mode',
    quickActionsHeading: 'Quick actions:',
    thinking: 'Thinking…',
    inputPlaceholder: 'Ask anything about your material...',
    sourceGroundedBadge: 'From your notes',
    modeSuffix: 'mode',
    noAnswerHint: "Don't give me the answer",
    sourceOn: 'Notes attached',
    sourceOff: 'Notes not attached',
    shiftEnter: 'Shift+Enter for new line',
    citationSingular: 'source',
    citationPlural: 'sources',
    citationToggle: 'show me where this came from',
    groundingVerified: 'Checked against your notes',
    groundingWarning: 'Review citations — some claims may lack source overlap',
    faithfulnessScore: 'Match to notes: {pct}%',
    ungroundedClaimsHeading: 'Not fully backed by your notes:',
    viewSourceForClaim: 'View source',
    lowConfidence: 'Lower confidence — verify with source',
    badgeSourceGrounded: 'From your notes',
    badgeAiInference: 'Tutor reasoning',
    badgeEnrichment: 'Extra context',
    badgeGlobalRag: 'Library search',
    badgeGraphRag: 'Concept links',
    badgeLocalRag: 'Local notes',
    badgeLowRetrieval: 'Clarify sources',
    pinnedFileLabel: 'Pinned',
    sourceSettingsTitle: 'Your notes',
    attachFileTitle: 'Pin a file',
    noAnalyzedFiles: 'No analyzed files yet',
    sourceModeFooter: (mode) => {
      if (mode === 'strict' || mode === 'notes-only') return 'My notes only';
      return 'Notes + trusted extras';
    },
  },
};

const EL: AgentContent = {
  modes: {
    socratic: { label: 'Socratic Tutor', desc: 'Καθοδηγούμενες ερωτήσεις' },
    direct: { label: 'Άμεση Εξήγηση', desc: 'Σαφείς εξηγήσεις' },
    beginner: { label: 'Αρχάριος', desc: 'Χωρίς προαπαιτούμενη γνώση' },
    'exam-coach': { label: 'Exam Coach', desc: 'Προετοιμασία εξετάσεων' },
    'deep-theory': { label: 'Βαθιά Θεωρία', desc: 'Αυστηρή ανάλυση' },
    practical: { label: 'Πρακτικό', desc: 'Ασκήσεις & κώδικας' },
    'error-diagnosis': { label: 'Διάγνωση Σφαλμάτων', desc: 'Ανάλυση λαθών' },
    feynman: { label: 'Feynman', desc: 'Εξήγησε για να μάθεις' },
    debate: { label: 'Συζήτηση', desc: 'Κριτική συζήτηση' },
    'oral-exam': { label: 'Προφορική Εξέταση', desc: 'Προσομοίωση καθηγητή' },
    'math-tutor': { label: 'Math Tutor', desc: 'Μαθηματικά βήμα-βήμα' },
    'coding-tutor': { label: 'Coding Tutor', desc: 'Διαδραστικός κώδικας' },
    'writing-coach': { label: 'Writing Coach', desc: 'Δομή κειμένου' },
    'memory-coach': { label: 'Memory Coach', desc: 'Εξάσκηση ανάκλησης' },
    motivation: { label: 'Focus Coach', desc: 'Μικρά πρακτικά βήματα' },
  },
  sourceModes: [
    { id: 'strict', label: 'Μόνο οι σημειώσεις μου', desc: 'Οι απαντήσεις μένουν μέσα στα uploads σου — χωρίς εξωτερική γνώση' },
    { id: 'enriched', label: 'Σημειώσεις + Ενίσχυση', desc: 'Το AI προσθέτει αξιόπιστο πλαίσιο όταν βοηθά' },
    { id: 'notes-only', label: 'Μόνο δομή σημειώσεων', desc: 'Περίγραμμα και επικεφαλίδες από τα uploads σου' },
  ],
  quickActions: [
    'Εξήγησε απλά αυτή την έννοια',
    'Δώσε μου μια ερώτηση εξάσκησης',
    'Από πού προκύπτει αυτό στις σημειώσεις μου;',
    'Ποια είναι τα συνηθισμένα λάθη εδώ;',
    'Φτιάξε flashcards για αυτό το θέμα',
    'Προσομοίωσε ερώτηση εξετάσεων',
    'Σύνθεση σε όλη τη βιβλιοθήκη',
  ],
  contextualPrompts: {
    emptySuggestionsHeading: 'Προτεινόμενα σημεία εκκίνησης',
    fromNextAction: (label, reason) => `Βοήθησέ με στο επόμενο βήμα: ${label}. ${reason}`,
    fromWeakArea: (concept) => `Εξήγησε γιατί κάνω συνεχώς λάθη στο ${concept} και πώς να το διορθώσω`,
    fromTask: (title) => `Οδήγησέ με βήμα-βήμα στην "${title}"`,
  },
  ui: {
    title: 'Synapse Agent',
    llmConnected: 'Έτοιμο · οι απαντήσεις γράφονται ζωντανά',
    offlineMode: 'Offline · Πρόσθεσε API key στις Ρυθμίσεις',
    sourceAttached: ' · οι σημειώσεις σου είναι συνημμένες',
    allSources: 'Όλες οι Πηγές',
    focus: 'Εστίαση',
    completeTask: 'Ολοκλήρωση εργασίας',
    agentModeHeading: 'Στυλ tutor',
    tutorModeHeading: 'Λειτουργία Tutor',
    sourceModeHeading: 'Λειτουργία πηγής',
    quickActionsHeading: 'Γρήγορες ενέργειες:',
    thinking: 'Σκέφτομαι…',
    inputPlaceholder: 'Ρώτα οτιδήποτε για το υλικό σου...',
    sourceGroundedBadge: 'Από τις σημειώσεις σου',
    modeSuffix: 'λειτουργία',
    noAnswerHint: 'Μη μου δώσεις την απάντηση',
    sourceOn: 'Σημειώσεις συνημμένες',
    sourceOff: 'Χωρίς συνημμένες σημειώσεις',
    shiftEnter: 'Shift+Enter για νέα γραμμή',
    citationSingular: 'πηγή',
    citationPlural: 'πηγές',
    citationToggle: 'δείξε μου από πού προήλθε',
    groundingVerified: 'Ελέγχθηκε με τις σημειώσεις σου',
    groundingWarning: 'Έλεγξε τις παραπομπές — κάποιοι ισχυρισμοί μπορεί να μην ταιριάζουν με πηγή',
    faithfulnessScore: 'Ταύτιση με σημειώσεις: {pct}%',
    ungroundedClaimsHeading: 'Δεν τεκμηριώνονται πλήρως από τις σημειώσεις σου:',
    viewSourceForClaim: 'Δες πηγή',
    lowConfidence: 'Χαμηλότερη εμπιστοσύνη — επαλήθευσε με την πηγή',
    badgeSourceGrounded: 'Από τις σημειώσεις σου',
    badgeAiInference: 'Συλλογισμός tutor',
    badgeEnrichment: 'Έξτρα πλαίσιο',
    badgeGlobalRag: 'Αναζήτηση βιβλιοθήκης',
    badgeGraphRag: 'Σύνδεση εννοιών',
    badgeLocalRag: 'Τοπικές σημειώσεις',
    badgeLowRetrieval: 'Διευκρίνισε πηγές',
    pinnedFileLabel: 'Καρφιτσωμένο',
    sourceSettingsTitle: 'Οι σημειώσεις σου',
    attachFileTitle: 'Καρφίτσωμα αρχείου',
    noAnalyzedFiles: 'Δεν υπάρχουν αναλυμένα αρχεία',
    sourceModeFooter: (mode) => {
      if (mode === 'strict' || mode === 'notes-only') return 'Μόνο οι σημειώσεις μου';
      return 'Σημειώσεις + αξιόπιστα έξτρα';
    },
  },
};

export function getAgentContent(lang: Lang): AgentContent {
  return lang === 'el' ? EL : EN;
}
