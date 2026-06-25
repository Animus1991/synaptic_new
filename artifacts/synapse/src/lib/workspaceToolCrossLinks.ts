/**
 * Cross-tool navigation graph for Study Workspace — related tools, learning flow,
 * and recommended next actions per active tool.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { ConceptSignal } from './workspaceConceptBus';

export type ToolCrossLink = {
  tool: WorkspaceToolId;
  labelEn: string;
  labelEl: string;
  /** Concept-bus signal recorded when jumping */
  signal?: ConceptSignal;
};

export type ToolCrossLinkDef = {
  id: WorkspaceToolId;
  groupEn: string;
  groupEl: string;
  purposeEn: string;
  purposeEl: string;
  /** Tools commonly used before this one */
  precedes: WorkspaceToolId[];
  /** Tools commonly used after this one */
  follows: WorkspaceToolId[];
  /** Quick-jump chips shown in the cross-link bar */
  related: ToolCrossLink[];
  /** Reader is implicit source for all grounded tools */
  readerAnchor: boolean;
  agentPromptEn: string;
  agentPromptEl: string;
};

export const WORKSPACE_TOOL_CROSS_LINKS: Record<WorkspaceToolId, ToolCrossLinkDef> = {
  reader: {
    id: 'reader',
    groupEn: 'Read & Notes',
    groupEl: 'Ανάγνωση',
    purposeEn: 'Source-faithful reading with section nav, OCR correction, and citations.',
    purposeEl: 'Ανάγνωση πηγής με πλοήγηση ενοτήτων, διόρθωση OCR και αναφορές.',
    precedes: [],
    follows: ['annotations', 'concept-map', 'feynman', 'quiz'],
    related: [
      { tool: 'annotations', labelEn: 'Highlight', labelEl: 'Επισήμανση', signal: 'annotated' },
      { tool: 'concept-map', labelEn: 'Map terms', labelEl: 'Χάρτης', signal: 'mapped' },
      { tool: 'feynman', labelEn: 'Explain', labelEl: 'Feynman', signal: 'explained' },
      { tool: 'quiz', labelEn: 'Test', labelEl: 'Κουίζ', signal: 'focus' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Explain this section from my notes.',
    agentPromptEl: 'Εξήγησε αυτή την ενότητα από τις σημειώσεις μου.',
  },
  annotations: {
    id: 'annotations',
    groupEn: 'Read & Notes',
    groupEl: 'Ανάγνωση',
    purposeEn: 'Highlights, pins, and margin notes tied to source excerpts.',
    purposeEl: 'Επισημάνσεις, pins και περιθώρια συνδεδεμένα με αποσπάσματα πηγής.',
    precedes: ['reader'],
    follows: ['feynman', 'scratchpad', 'concept-map'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'feynman', labelEn: 'Explain note', labelEl: 'Feynman', signal: 'explained' },
      { tool: 'scratchpad', labelEn: 'Formulas', labelEl: 'Τύποι', signal: 'noted' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Summarize my highlighted passages for this concept.',
    agentPromptEl: 'Σύνοψε τα επισημασμένα αποσπάσματα για αυτή την έννοια.',
  },
  scratchpad: {
    id: 'scratchpad',
    groupEn: 'Read & Notes',
    groupEl: 'Ανάγνωση',
    purposeEn: 'Formula solver with variables, steps, and optional graph.',
    purposeEl: 'Επίλυση τύπων με μεταβλητές, βήματα και προαιρετικό γράφημα.',
    precedes: ['reader'],
    follows: ['whiteboard', 'simulator', 'quiz'],
    related: [
      { tool: 'whiteboard', labelEn: 'Whiteboard', labelEl: 'Πίνακας', signal: 'noted' },
      { tool: 'simulator', labelEn: 'Simulate', labelEl: 'Προσομ.', signal: 'simulated' },
      { tool: 'reader', labelEn: 'Source', labelEl: 'Πηγή', signal: 'read' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Walk me through this formula step by step using my notes.',
    agentPromptEl: 'Οδήγησέ με βήμα-βήμα σε αυτόν τον τύπο με βάση τις σημειώσεις μου.',
  },
  'concept-map': {
    id: 'concept-map',
    groupEn: 'Understand',
    groupEl: 'Κατανόηση',
    purposeEn: 'Visual prerequisite and co-occurrence graph from your material.',
    purposeEl: 'Οπτικός γράφος προαπαιτούμενων και συνεμφάνισης από το υλικό σου.',
    precedes: ['reader'],
    follows: ['feynman', 'compare', 'quiz'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'feynman', labelEn: 'Feynman', labelEl: 'Feynman', signal: 'explained' },
      { tool: 'compare', labelEn: 'Compare', labelEl: 'Σύγκριση', signal: 'read' },
      { tool: 'leitner', labelEn: 'Cards', labelEl: 'Κάρτες', signal: 'focus' },
    ],
    readerAnchor: true,
    agentPromptEn: 'How do these concepts connect according to my notes?',
    agentPromptEl: 'Πώς συνδέονται αυτές οι έννοιες σύμφωνα με τις σημειώσεις μου;',
  },
  feynman: {
    id: 'feynman',
    groupEn: 'Understand',
    groupEl: 'Κατανόηση',
    purposeEn: 'Explain simply; rubric checks gaps against source outline.',
    purposeEl: 'Απλή εξήγηση· το rubric εντοπίζει κενά έναντι του outline πηγής.',
    precedes: ['reader', 'concept-map'],
    follows: ['quiz', 'leitner', 'debate'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'concept-map', labelEn: 'Map', labelEl: 'Χάρτης', signal: 'mapped' },
      { tool: 'quiz', labelEn: 'Quiz', labelEl: 'Κουίζ', signal: 'focus' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Explain this concept from zero using only my uploaded notes.',
    agentPromptEl: 'Εξήγησε την έννοια από το μηδέν μόνο από τις σημειώσεις μου.',
  },
  compare: {
    id: 'compare',
    groupEn: 'Understand',
    groupEl: 'Κατανόηση',
    purposeEn: 'Side-by-side dimensions extracted from tables and glossary.',
    purposeEl: 'Διαστάσεις παράλληλης σύγκρισης από πίνακες και γλωσσάρι.',
    precedes: ['reader'],
    follows: ['debate', 'quiz'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'debate', labelEn: 'Debate', labelEl: 'Συζήτηση', signal: 'mapped' },
      { tool: 'concept-map', labelEn: 'Map', labelEl: 'Χάρτης', signal: 'mapped' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Compare these terms for exam prep using my notes.',
    agentPromptEl: 'Σύγκρινε τους όρους για εξέταση με βάση τις σημειώσεις μου.',
  },
  debate: {
    id: 'debate',
    groupEn: 'Understand',
    groupEl: 'Κατανόηση',
    purposeEn: 'Argument tree: claims, support, and counter-arguments from text.',
    purposeEl: 'Δέντρο επιχειρημάτων: ισχυρισμοί, τεκμήρια και αντεπιχειρήματα από κείμενο.',
    precedes: ['reader', 'compare'],
    follows: ['feynman', 'quiz'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'compare', labelEn: 'Compare', labelEl: 'Σύγκριση', signal: 'read' },
      { tool: 'feynman', labelEn: 'Feynman', labelEl: 'Feynman', signal: 'explained' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Challenge my understanding of this claim using the source.',
    agentPromptEl: 'Αμφισβήτησε την κατανόησή μου για αυτόν τον ισχυρισμό με βάση την πηγή.',
  },
  quiz: {
    id: 'quiz',
    groupEn: 'Practice',
    groupEl: 'Εξάσκηση',
    purposeEn: 'Recall check generated from glossary and source sentences.',
    purposeEl: 'Έλεγχος ανάκλησης από γλωσσάρι και προτάσεις πηγής.',
    precedes: ['reader', 'feynman', 'concept-map'],
    follows: ['leitner', 'dashboard'],
    related: [
      { tool: 'leitner', labelEn: 'Flashcards', labelEl: 'Κάρτες', signal: 'focus' },
      { tool: 'reader', labelEn: 'Review source', labelEl: 'Πηγή', signal: 'read' },
      { tool: 'feynman', labelEn: 'Re-explain', labelEl: 'Feynman', signal: 'explained' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Why was my quiz answer wrong? Use my notes.',
    agentPromptEl: 'Γιατί ήταν λάθος η απάντησή μου; Χρησιμοποίησε τις σημειώσεις μου.',
  },
  leitner: {
    id: 'leitner',
    groupEn: 'Practice',
    groupEl: 'Εξάσκηση',
    purposeEn: 'Spaced repetition deck; FSRS ratings feed mastery model.',
    purposeEl: 'Κάρτες επανάληψης· οι βαθμολογίες FSRS τροφοδοτούν το μοντέλο κυριαρχίας.',
    precedes: ['reader', 'quiz'],
    follows: ['quiz', 'dashboard'],
    related: [
      { tool: 'quiz', labelEn: 'Quiz', labelEl: 'Κουίζ', signal: 'focus' },
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'concept-map', labelEn: 'Map', labelEl: 'Χάρτης', signal: 'mapped' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Create more flashcard-style prompts from this section.',
    agentPromptEl: 'Δημιούργησε περισσότερες κάρτες από αυτή την ενότητα.',
  },
  simulator: {
    id: 'simulator',
    groupEn: 'Practice',
    groupEl: 'Εξάσκηση',
    purposeEn: 'Interactive sliders when economics/numeric cues exist in notes.',
    purposeEl: 'Διαδραστικοί sliders όταν υπάρχουν οικονομικά/αριθμητικά cues στις σημειώσεις.',
    precedes: ['reader', 'scratchpad'],
    follows: ['quiz', 'whiteboard'],
    related: [
      { tool: 'scratchpad', labelEn: 'Formulas', labelEl: 'Τύποι', signal: 'noted' },
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'quiz', labelEn: 'Quiz', labelEl: 'Κουίζ', signal: 'simulated' },
      { tool: 'timer', labelEn: 'Timed block', labelEl: 'Χρονόμετρο', signal: 'focus' },
    ],
    readerAnchor: true,
    agentPromptEn: 'Interpret the simulation results using my lecture notes.',
    agentPromptEl: 'Ερμήνευσε τα αποτελέσματα προσομοίωσης με βάση τις διαλέξεις μου.',
  },
  whiteboard: {
    id: 'whiteboard',
    groupEn: 'Practice',
    groupEl: 'Εξάσκηση',
    purposeEn: 'Freehand canvas; imports formulas from scratchpad.',
    purposeEl: 'Ελεύθερος καμβάς· εισάγει τύπους από scratchpad.',
    precedes: ['scratchpad', 'reader'],
    follows: ['feynman', 'annotations'],
    related: [
      { tool: 'scratchpad', labelEn: 'Scratchpad', labelEl: 'Τύποι', signal: 'noted' },
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
    ],
    readerAnchor: false,
    agentPromptEn: 'Help me diagram this concept from my notes.',
    agentPromptEl: 'Βοήθησέ με να σχεδιάσω αυτή την έννοια από τις σημειώσεις μου.',
  },
  timer: {
    id: 'timer',
    groupEn: 'Focus',
    groupEl: 'Εστίαση',
    purposeEn: 'Pomodoro-style focus; logs minutes to study analytics.',
    purposeEl: 'Εστίαση Pomodoro· καταγράφει λεπτά στα analytics μελέτης.',
    precedes: ['reader'],
    follows: ['dashboard', 'quiz'],
    related: [
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'dashboard', labelEn: 'Progress', labelEl: 'Πρόοδος', signal: 'focus' },
      { tool: 'simulator', labelEn: 'Simulator', labelEl: 'Προσομοίωση', signal: 'simulated' },
    ],
    readerAnchor: false,
    agentPromptEn: 'What should I focus on in the next study block?',
    agentPromptEl: 'Σε τι να εστιάσω στο επόμενο block μελέτης;',
  },
  dashboard: {
    id: 'dashboard',
    groupEn: 'Focus',
    groupEl: 'Εστίαση',
    purposeEn: 'Mastery, weak spots, and next actions from learner model.',
    purposeEl: 'Κυριαρχία, αδύναμα σημεία και επόμενες ενέργειες από μοντέλο μαθητή.',
    precedes: ['quiz', 'leitner', 'timer'],
    follows: ['reader', 'leitner'],
    related: [
      { tool: 'leitner', labelEn: 'Review cards', labelEl: 'Κάρτες', signal: 'focus' },
      { tool: 'reader', labelEn: 'Reader', labelEl: 'Ανάγνωση', signal: 'read' },
      { tool: 'quiz', labelEn: 'Quiz', labelEl: 'Κουίζ', signal: 'focus' },
    ],
    readerAnchor: false,
    agentPromptEn: 'Which weak concept should I tackle next and why?',
    agentPromptEl: 'Ποια αδύναμη έννοια να αντιμετωπίσω στη συνέχεια και γιατί;',
  },
};

export function getToolCrossLinkDef(tool: WorkspaceToolId): ToolCrossLinkDef {
  return WORKSPACE_TOOL_CROSS_LINKS[tool];
}
