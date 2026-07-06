/**
 * Dedicated Agent chips for Feynman / Compare / Debate (XTL-02).
 */

import type { Lang } from './i18n';
import type { I18nKey } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import type { ToolAgentIntent } from './workspaceToolAgentPrompts';
import {
  buildCompareToolAgentPrompt,
  buildDebateClaimAgentPrompt,
  buildFeynmanToolAgentPrompt,
} from './workspaceToolAgentPrompts';

export type ToolAgentChipDef = {
  id: string;
  labelKey: I18nKey;
  intent: ToolAgentIntent;
  buildPrompt: (concept: string, lang: Lang) => string;
};

const FEYNMAN_CHIPS: ToolAgentChipDef[] = [
  {
    id: 'explain',
    labelKey: 'toolAgentChipFeynmanExplain',
    intent: 'default',
    buildPrompt: buildFeynmanToolAgentPrompt,
  },
  {
    id: 'critique',
    labelKey: 'toolAgentChipFeynmanCritique',
    intent: 'feynman-critique',
    buildPrompt: (concept, lang) => (lang === 'el'
      ? `Κριτική Feynman: βοήθησέ με να εντοπίσω κενά στην απλή εξήγησή μου για «${concept}».`
      : `Feynman critique: help me find gaps in my simple explanation of "${concept}".`),
  },
];

const COMPARE_CHIPS: ToolAgentChipDef[] = [
  {
    id: 'compare-exam',
    labelKey: 'toolAgentChipCompareExam',
    intent: 'default',
    buildPrompt: buildCompareToolAgentPrompt,
  },
  {
    id: 'compare-diff',
    labelKey: 'toolAgentChipCompareDiff',
    intent: 'compare-row',
    buildPrompt: (concept, lang) => (lang === 'el'
      ? `Εξήγησε τις κύριες διαφορές μεταξύ των όρων σύγκρισης για «${concept}» με βάση τις σημειώσεις μου.`
      : `Explain the main differences between comparison terms for "${concept}" using my notes.`),
  },
];

const DEBATE_CHIPS: ToolAgentChipDef[] = [
  {
    id: 'challenge',
    labelKey: 'toolAgentChipDebateChallenge',
    intent: 'default',
    buildPrompt: (concept, lang) => buildDebateClaimAgentPrompt(concept, lang),
  },
  {
    id: 'socratic',
    labelKey: 'toolAgentChipDebateSocratic',
    intent: 'selection',
    buildPrompt: (concept, lang) => (lang === 'el'
      ? `Σωκρατική πρόκληση: τίθεσε ερωτήσεις που ελέγχουν την κατανόησή μου για «${concept}» με βάση τις σημειώσεις μου.`
      : `Socratic challenge: ask questions that test my understanding of "${concept}" using my notes.`),
  },
];

const CHIPS_BY_TOOL: Partial<Record<WorkspaceToolId, ToolAgentChipDef[]>> = {
  feynman: FEYNMAN_CHIPS,
  compare: COMPARE_CHIPS,
  debate: DEBATE_CHIPS,
};

export function getToolAgentChips(tool: WorkspaceToolId): ToolAgentChipDef[] {
  return CHIPS_BY_TOOL[tool] ?? [];
}

export function hasDedicatedToolAgentChips(tool: WorkspaceToolId): boolean {
  return getToolAgentChips(tool).length > 0;
}
