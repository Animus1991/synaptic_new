/**
 * Shared workspace tool metadata — used by desktop dock and mobile drawer.
 */

import {
  BookOpen, Network, PenTool, PenSquare, Timer, Lightbulb, HelpCircle, GitCompare,
  Scale, FlaskConical, BarChart3, Layers, Highlighter,
} from '@/lib/lucide-shim';
import type { LucideIcon } from '@/lib/lucide-shim';
import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceToolMeta = {
  id: WorkspaceToolId;
  icon: LucideIcon;
  label: string;
  labelEl: string;
  desc: string;
  descEl: string;
};

/** OPT-K12 — each tool keeps a distinct silhouette (monochrome wells under Minimal). */
export const WORKSPACE_TOOLS: WorkspaceToolMeta[] = [
  { id: 'reader', icon: BookOpen, label: 'Reader', labelEl: 'Ανάγνωση', desc: 'Read your notes for this step', descEl: 'Διάβασε τις σημειώσεις για αυτό το βήμα' },
  { id: 'concept-map', icon: Network, label: 'Concept Map', labelEl: 'Χάρτης εννοιών', desc: 'Visualize links', descEl: 'Οπτικές συνδέσεις' },
  { id: 'scratchpad', icon: PenTool, label: 'Scratchpad', labelEl: 'Πρόχειρο', desc: 'Try a formula step by step', descEl: 'Δοκίμασε τύπο βήμα-βήμα' },
  { id: 'whiteboard', icon: PenSquare, label: 'Whiteboard', labelEl: 'Πίνακας σχεδίασης', desc: 'Draw & diagram', descEl: 'Οπτική σκέψη & σχέδια' },
  { id: 'leitner', icon: Layers, label: 'Flashcards', labelEl: 'Κάρτες', desc: 'Quick recall practice', descEl: 'Γρήγορη εξάσκηση ανάκλησης' },
  { id: 'feynman', icon: Lightbulb, label: 'Feynman', labelEl: 'Feynman', desc: 'Teach it simply', descEl: 'Δίδαξέ το απλά' },
  { id: 'quiz', icon: HelpCircle, label: 'Quiz', labelEl: 'Κουίζ', desc: 'Check what sticks', descEl: 'Δες τι μένει' },
  { id: 'simulator', icon: FlaskConical, label: 'Simulator', labelEl: 'Προσομοίωση', desc: 'Exam-style practice', descEl: 'Προσομοίωση εξέτασης' },
  { id: 'compare', icon: GitCompare, label: 'Compare', labelEl: 'Σύγκριση', desc: 'Side-by-side concepts', descEl: 'Σύγκριση εννοιών' },
  { id: 'debate', icon: Scale, label: 'Debate', labelEl: 'Συζήτηση', desc: 'Claims for & against', descEl: 'Ισχυρισμοί υπέρ & κατά' },
  { id: 'timer', icon: Timer, label: 'Timer', labelEl: 'Χρονόμετρο', desc: 'Focus & exam countdown', descEl: 'Εστίαση & αντίστροφη εξέτασης' },
  { id: 'annotations', icon: Highlighter, label: 'Annotations', labelEl: 'Επισημάνσεις', desc: 'Mark highlights & notes on your source', descEl: 'Επισημάνσεις και σημειώσεις στην πηγή' },
  { id: 'dashboard', icon: BarChart3, label: 'Progress', labelEl: 'Πρόοδος', desc: 'Readiness, weak spots & next step', descEl: 'Ετοιμότητα, αδύναμα & επόμενο βήμα' },
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
