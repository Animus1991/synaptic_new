import type { AgentMode } from '../types';
import type { Lang } from './i18n';

export type AgentModeCopy = { label: string; desc: string };

export type AgentUiCopy = {
  title: string;
  llmConnected: string;
  offlineMode: string;
  sourceAttached: string;
  allSources: string;
  focus: string;
  completeTask: string;
  agentModeHeading: string;
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
  lowConfidence: string;
  badgeSourceGrounded: string;
  badgeAiInference: string;
  badgeEnrichment: string;
};

export type AgentContent = {
  modes: Record<AgentMode, AgentModeCopy>;
  quickActions: string[];
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
  quickActions: [
    'Explain this concept simply',
    'Give me a practice question',
    'Where does this come from in my notes?',
    'What are common mistakes here?',
    'Create flashcards for this topic',
    'Simulate an exam question',
  ],
  ui: {
    title: 'Synapse Agent',
    llmConnected: 'LLM connected · streaming',
    offlineMode: 'Offline mode · Add API key in Settings',
    sourceAttached: ' · source context attached',
    allSources: 'All Sources',
    focus: 'Focus',
    completeTask: 'Complete task',
    agentModeHeading: 'Agent Mode',
    quickActionsHeading: 'Quick actions:',
    thinking: 'Thinking…',
    inputPlaceholder: 'Ask anything about your material...',
    sourceGroundedBadge: 'Source-grounded',
    modeSuffix: 'mode',
    noAnswerHint: "🛡️ Don't give me the answer",
    sourceOn: '📎 Source context on',
    sourceOff: '📎 Source context off',
    shiftEnter: 'Shift+Enter for new line',
    citationSingular: 'source',
    citationPlural: 'sources',
    citationToggle: 'show me where this came from',
    groundingVerified: '✓ Source grounding verified',
    groundingWarning: 'Review citations — some claims may lack source overlap',
    lowConfidence: 'Lower confidence — verify with source',
    badgeSourceGrounded: '📖 Source-grounded',
    badgeAiInference: '🧠 AI inference',
    badgeEnrichment: '✨ External enrichment',
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
  quickActions: [
    'Εξήγησε απλά αυτή την έννοια',
    'Δώσε μου μια ερώτηση εξάσκησης',
    'Από πού προκύπτει αυτό στις σημειώσεις μου;',
    'Ποια είναι τα συνηθισμένα λάθη εδώ;',
    'Φτιάξε flashcards για αυτό το θέμα',
    'Προσομοίωσε ερώτηση εξετάσεων',
  ],
  ui: {
    title: 'Synapse Agent',
    llmConnected: 'LLM συνδεδεμένο · streaming',
    offlineMode: 'Offline · Πρόσθεσε API key στις Ρυθμίσεις',
    sourceAttached: ' · συνημμένο περιεχόμενο πηγής',
    allSources: 'Όλες οι Πηγές',
    focus: 'Εστίαση',
    completeTask: 'Ολοκλήρωση εργασίας',
    agentModeHeading: 'Λειτουργία Agent',
    quickActionsHeading: 'Γρήγορες ενέργειες:',
    thinking: 'Σκέφτομαι…',
    inputPlaceholder: 'Ρώτα οτιδήποτε για το υλικό σου...',
    sourceGroundedBadge: 'Με βάση πηγές',
    modeSuffix: 'λειτουργία',
    noAnswerHint: '🛡️ Μη μου δώσεις την απάντηση',
    sourceOn: '📎 Πηγή ενεργή',
    sourceOff: '📎 Πηγή ανενεργή',
    shiftEnter: 'Shift+Enter για νέα γραμμή',
    citationSingular: 'πηγή',
    citationPlural: 'πηγές',
    citationToggle: 'δείξε μου από πού προήλθε',
    groundingVerified: '✓ Επαλήθευση πηγής επιτυχής',
    groundingWarning: 'Έλεγξε τις παραπομπές — κάποιοι ισχυρισμοί μπορεί να μην ταιριάζουν με πηγή',
    lowConfidence: 'Χαμηλότερη εμπιστοσύνη — επαλήθευσε με την πηγή',
    badgeSourceGrounded: '📖 Με βάση πηγές',
    badgeAiInference: '🧠 AI inference',
    badgeEnrichment: '✨ Εξωτερικό enrichment',
  },
};

export function getAgentContent(lang: Lang): AgentContent {
  return lang === 'el' ? EL : EN;
}
