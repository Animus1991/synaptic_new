/**
 * OPT-R14 — Agent mode menu groups (all modes remain reachable).
 */

import type { AgentMode } from '../types';
import type { I18nKey } from './i18n';

export type AgentModeGroupId = 'core' | 'exam' | 'subject' | 'support' | 'more';

export type AgentModeGroupDef = {
  id: AgentModeGroupId;
  labelKey: I18nKey;
  modes: readonly AgentMode[];
};

/** Canonical group order — every AgentMode must appear exactly once across groups. */
export const AGENT_MODE_GROUPS: readonly AgentModeGroupDef[] = [
  {
    id: 'core',
    labelKey: 'agentModeGroupCore',
    modes: ['socratic', 'direct', 'beginner', 'feynman', 'debate'],
  },
  {
    id: 'exam',
    labelKey: 'agentModeGroupExam',
    modes: ['exam-coach', 'oral-exam', 'error-diagnosis'],
  },
  {
    id: 'subject',
    labelKey: 'agentModeGroupSubject',
    modes: ['deep-theory', 'practical', 'math-tutor', 'coding-tutor', 'writing-coach'],
  },
  {
    id: 'support',
    labelKey: 'agentModeGroupSupport',
    modes: ['memory-coach', 'motivation'],
  },
] as const;

export type AgentModeGroupPartition<T extends { mode: AgentMode }> = {
  id: AgentModeGroupId;
  labelKey: I18nKey;
  modes: T[];
};

export function partitionAgentModesByGroup<T extends { mode: AgentMode }>(
  modes: T[],
): AgentModeGroupPartition<T>[] {
  const byMode = new Map(modes.map((m) => [m.mode, m]));
  const used = new Set<AgentMode>();
  const groups: AgentModeGroupPartition<T>[] = [];

  for (const def of AGENT_MODE_GROUPS) {
    const items: T[] = [];
    for (const id of def.modes) {
      const hit = byMode.get(id);
      if (hit) {
        items.push(hit);
        used.add(id);
      }
    }
    if (items.length > 0) {
      groups.push({ id: def.id, labelKey: def.labelKey, modes: items });
    }
  }

  const leftover = modes.filter((m) => !used.has(m.mode));
  if (leftover.length > 0) {
    groups.push({
      id: 'more',
      labelKey: 'agentModeGroupMore',
      modes: leftover,
    });
  }

  return groups;
}

export function groupIdForAgentMode(mode: AgentMode): AgentModeGroupId {
  for (const def of AGENT_MODE_GROUPS) {
    if (def.modes.includes(mode)) return def.id;
  }
  return 'more';
}
