/**
 * UX-05 — Visual catalog metadata for Agent modes (FigmaSynaptic-style).
 */

import type { AgentMode } from '../types';

export type AgentModeVisual = {
  color: string;
  badge?: string;
};

export const AGENT_MODE_VISUALS: Record<AgentMode, AgentModeVisual> = {
  socratic: { color: '#818CF8' },
  direct: { color: '#34D399' },
  beginner: { color: '#34D399' },
  'exam-coach': { color: '#F87171', badge: 'Popular' },
  'deep-theory': { color: '#A78BFA' },
  practical: { color: '#60A5FA' },
  'error-diagnosis': { color: '#FCD34D' },
  feynman: { color: '#FB923C' },
  debate: { color: '#94A3B8' },
  'oral-exam': { color: '#E879F9' },
  'math-tutor': { color: '#F59E0B' },
  'coding-tutor': { color: '#60A5FA' },
  'writing-coach': { color: '#818CF8' },
  'memory-coach': { color: '#34D399' },
  motivation: { color: '#FCD34D' },
};
