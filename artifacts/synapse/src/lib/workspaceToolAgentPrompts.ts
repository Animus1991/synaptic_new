/**
 * Wave 4 — tool-specific Agent modes and prompts for Study Workspace handoffs.
 */

import type { AgentMode } from '../types';
import type { ConceptRemediationId } from './conceptBusRemediation';
import type { Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import { getToolCrossLinkDef } from './workspaceToolCrossLinks';

export type ToolAgentIntent =
  | 'default'
  | 'selection'
  | 'section'
  | 'explain-zero'
  | 'quiz-mistake'
  | 'feynman-critique'
  | 'formula'
  | 'compare-row'
  | 'annotation'
  | 'scratchpad-note'
  | 'diagram-coach'
  | 'diagram-critique'
  | 'diagram-explain'
  | 'remediation';

/** Default Agent mode when opening from each workspace tool. */
export const TOOL_AGENT_MODES: Record<WorkspaceToolId, AgentMode> = {
  reader: 'direct',
  annotations: 'direct',
  scratchpad: 'math-tutor',
  'concept-map': 'socratic',
  feynman: 'feynman',
  compare: 'exam-coach',
  debate: 'debate',
  quiz: 'error-diagnosis',
  leitner: 'memory-coach',
  simulator: 'practical',
  whiteboard: 'practical',
  timer: 'motivation',
  dashboard: 'exam-coach',
};

const SELECTION_MODES: Partial<Record<WorkspaceToolId, AgentMode>> = {
  reader: 'socratic',
  debate: 'debate',
  quiz: 'error-diagnosis',
  feynman: 'feynman',
  compare: 'exam-coach',
  'concept-map': 'socratic',
  leitner: 'memory-coach',
};

export function resolveToolAgentMode(
  tool: WorkspaceToolId,
  intent: ToolAgentIntent = 'default',
): AgentMode {
  if (intent === 'explain-zero') return 'beginner';
  if (intent === 'feynman-critique') return 'writing-coach';
  if (intent === 'quiz-mistake') return 'feynman';
  if (intent === 'formula' || intent === 'scratchpad-note') return 'math-tutor';
  if (intent === 'compare-row') return 'exam-coach';
  if (intent === 'annotation') return 'direct';
  if (intent === 'diagram-coach' || intent === 'diagram-critique' || intent === 'diagram-explain') return 'socratic';
  if (intent === 'selection') {
    return SELECTION_MODES[tool] ?? TOOL_AGENT_MODES[tool];
  }
  if (intent === 'section' && tool === 'reader') return 'socratic';
  return TOOL_AGENT_MODES[tool];
}

export function resolveRemediationAgentMode(action: ConceptRemediationId): AgentMode {
  if (action === 'explain') return 'beginner';
  if (action === 'feynman') return 'feynman';
  if (action === 'quiz') return 'error-diagnosis';
  if (action === 'flashcards') return 'memory-coach';
  if (action === 'compare') return 'exam-coach';
  return 'direct';
}

export function buildToolDefaultAgentPrompt(
  tool: WorkspaceToolId,
  lang: Lang,
  concept?: string,
  sectionTitle?: string,
): string {
  const def = getToolCrossLinkDef(tool);
  const base = lang === 'el' ? def.agentPromptEl : def.agentPromptEn;
  const parts: string[] = [base];
  const section = sectionTitle?.trim();
  const term = concept?.trim();
  if (section) {
    parts.push(lang === 'el' ? `ενότητα: «${section}»` : `section: "${section}"`);
  }
  if (term) {
    parts.push(lang === 'el' ? `έννοια: ${term}` : `concept: ${term}`);
  }
  return parts.join(lang === 'el' ? ' · ' : ' · ');
}

export function buildSectionAskAgentPrompt(
  sectionLabel: string,
  concept: string,
  lang: Lang,
): string {
  if (lang === 'el') {
    return `Βοήθησέ με με την ενότητα «${sectionLabel}» (έννοια: ${concept}). Τι πρέπει να ξέρω;`;
  }
  return `Help me with section "${sectionLabel}" (concept: ${concept}). What should I know?`;
}

export function buildFeynmanToolAgentPrompt(concept: string, lang: Lang): string {
  if (lang === 'el') {
    return `Βοήθησέ με να εξηγήσω απλά την έννοια «${concept}» με βάση τις σημειώσεις μου (Feynman).`;
  }
  return `Help me explain "${concept}" simply from my notes (Feynman).`;
}

export function buildCompareToolAgentPrompt(concept: string, lang: Lang): string {
  if (lang === 'el') {
    return `Σύγκρινε τους όρους για εξέταση (έννοια: ${concept}) με βάση τις σημειώσεις μου.`;
  }
  return `Compare these terms for exam prep (concept: ${concept}) using my notes.`;
}

export function buildDebateClaimAgentPrompt(claim: string, lang: Lang): string {
  const excerpt = claim.trim().slice(0, 200);
  if (lang === 'el') {
    return `Αμφισβήτησε την κατανόησή μου για τον ισχυρισμό «${excerpt}» με βάση τις σημειώσεις μου.`;
  }
  return `Challenge my understanding of the claim "${excerpt}" using my notes.`;
}

export function buildAnnotationAgentPrompt(text: string, lang: Lang): string {
  const excerpt = text.trim().slice(0, 500);
  if (lang === 'el') {
    return `Βοήθησέ με με αυτό το απόσπασμα από τις σημειώσεις μου:\n\n«${excerpt}»`;
  }
  return `Help me with this excerpt from my notes:\n\n"${excerpt}"`;
}

export function buildFormulaAgentPrompt(formulaText: string, lang: Lang): string {
  if (lang === 'el') {
    return `Εξήγησε βήμα-βήμα τον τύπο: ${formulaText}`;
  }
  return `Explain this formula step by step: ${formulaText}`;
}

export type ScratchpadAgentNoteMode = 'self-explanation' | 'exam-draft' | 'notes';

export function buildScratchpadNoteAgentPrompt(
  text: string,
  sectionTitle: string,
  mode: ScratchpadAgentNoteMode,
  lang: Lang,
): string {
  const excerpt = text.slice(0, 800);
  const critique = mode === 'self-explanation' || mode === 'exam-draft';
  if (lang === 'el') {
    if (critique) {
      return `Κριτική για την αυτο-εξήγησή μου (${sectionTitle}):\n\n${excerpt}`;
    }
    return `Βοήθησέ με με αυτές τις σημειώσεις scratchpad:\n\n${excerpt}`;
  }
  if (critique) {
    return `Critique my self-explanation (${sectionTitle}):\n\n${excerpt}`;
  }
  return `Help me with these scratchpad notes:\n\n${excerpt}`;
}

export function resolveScratchpadNoteAgentMode(mode: ScratchpadAgentNoteMode): AgentMode {
  if (mode === 'self-explanation' || mode === 'exam-draft') return 'writing-coach';
  return 'math-tutor';
}
