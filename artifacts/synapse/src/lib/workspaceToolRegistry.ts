/**
 * Shared workspace tool metadata — used by desktop dock and mobile drawer.
 */

import {
  BookOpen, Brain, PenTool, Layout, Timer, MessageSquare, Zap, GitCompare,
  Scale, FlaskConical, BarChart3, Layers, StickyNote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceToolMeta = {
  id: WorkspaceToolId;
  icon: LucideIcon;
  label: string;
  labelEl: string;
  desc: string;
  descEl: string;
};

export const WORKSPACE_TOOLS: WorkspaceToolMeta[] = [
  { id: 'reader', icon: BookOpen, label: 'Reader', labelEl: 'Ανάγνωση', desc: 'Source text', descEl: 'Κείμενο πηγής' },
  { id: 'concept-map', icon: Brain, label: 'Concept Map', labelEl: 'Χάρτης εννοιών', desc: 'Visualize links', descEl: 'Οπτικές συνδέσεις' },
  { id: 'scratchpad', icon: PenTool, label: 'Scratchpad', labelEl: 'Πρόχειρο', desc: 'Draft notes & formulas', descEl: 'Πρόχειρες σημειώσεις & τύποι' },
  { id: 'whiteboard', icon: Layout, label: 'Whiteboard', labelEl: 'Πίνακας σχεδίασης', desc: 'Draw & diagram', descEl: 'Οπτική σκέψη & σχέδια' },
  { id: 'leitner', icon: Layers, label: 'Flashcards', labelEl: 'Κάρτες', desc: 'Spaced repetition', descEl: 'Επανάληψη με διαστήματα' },
  { id: 'feynman', icon: MessageSquare, label: 'Feynman', labelEl: 'Feynman', desc: 'Explain simply', descEl: 'Εξήγηση με δικά σου λόγια' },
  { id: 'quiz', icon: Zap, label: 'Quiz', labelEl: 'Κουίζ', desc: 'Active recall check', descEl: 'Έλεγχος γνώσης (active recall)' },
  { id: 'simulator', icon: FlaskConical, label: 'Simulator', labelEl: 'Προσομοίωση', desc: 'Exam-style practice', descEl: 'Προσομοίωση εξέτασης' },
  { id: 'compare', icon: GitCompare, label: 'Compare', labelEl: 'Σύγκριση', desc: 'Side-by-side concepts', descEl: 'Σύγκριση εννοιών' },
  { id: 'debate', icon: Scale, label: 'Debate', labelEl: 'Συζήτηση', desc: 'Argument map', descEl: 'Επιχειρήματα & αντίλογος' },
  { id: 'timer', icon: Timer, label: 'Timer', labelEl: 'Χρονόμετρο', desc: 'Focus sessions', descEl: 'Χρονόμετρο μελέτης' },
  { id: 'annotations', icon: StickyNote, label: 'Annotations', labelEl: 'Επισημάνσεις', desc: 'Highlights on source', descEl: 'Επισημάνσεις στο κείμενο' },
  { id: 'dashboard', icon: BarChart3, label: 'Progress', labelEl: 'Πρόοδος', desc: 'Mastery & activity', descEl: 'Πρόοδος & στατιστικά' },
];

/** Primary tools — always visible in tool strip (Prompt 24). */
export const PRIMARY_WORKSPACE_TOOLS: WorkspaceToolId[] = [
  'reader', 'concept-map', 'quiz', 'leitner', 'dashboard',
];

/** Secondary tools — accessible via “More” or ⌘K. */
export const SECONDARY_WORKSPACE_TOOLS: WorkspaceToolId[] = [
  'annotations', 'scratchpad', 'feynman', 'compare', 'debate',
  'simulator', 'whiteboard', 'timer',
];

export const WORKSPACE_TOOL_GROUPS: { label: string; labelEl: string; tools: WorkspaceToolId[] }[] = [
  { label: 'Read & Notes', labelEl: 'Ανάγνωση', tools: ['reader', 'annotations', 'scratchpad'] },
  { label: 'Understand', labelEl: 'Κατανόηση', tools: ['concept-map', 'feynman', 'compare', 'debate'] },
  { label: 'Practice', labelEl: 'Εξάσκηση', tools: ['quiz', 'leitner', 'simulator', 'whiteboard'] },
  { label: 'Focus', labelEl: 'Εστίαση', tools: ['timer', 'dashboard'] },
];

export function getWorkspaceToolMeta(id: WorkspaceToolId): WorkspaceToolMeta {
  return WORKSPACE_TOOLS.find((t) => t.id === id) ?? WORKSPACE_TOOLS[0]!;
}

export function workspaceToolLabel(id: WorkspaceToolId, lang: 'en' | 'el'): string {
  const meta = getWorkspaceToolMeta(id);
  return lang === 'el' ? meta.labelEl : meta.label;
}

export function workspaceToolDescription(id: WorkspaceToolId, lang: 'en' | 'el'): string {
  const meta = getWorkspaceToolMeta(id);
  return lang === 'el' ? meta.descEl : meta.desc;
}
