import { describe, expect, it } from 'vitest';
import type { AgentMode } from '../types';
import { offlineAgentModeCovered, offlineAgentReply } from './offlineAgentReplies';

const MODES: AgentMode[] = [
  'socratic', 'direct', 'beginner', 'exam-coach', 'deep-theory', 'practical',
  'error-diagnosis', 'feynman', 'debate', 'oral-exam', 'math-tutor',
  'coding-tutor', 'writing-coach', 'memory-coach', 'motivation',
];

describe('offlineAgentReply', () => {
  it('covers every agent mode in both locales with distinct copy', () => {
    for (const mode of MODES) {
      expect(offlineAgentModeCovered(mode)).toBe(true);
      const en = offlineAgentReply('elasticity', mode, 'en');
      const el = offlineAgentReply('ελαστικότητα', mode, 'el');
      expect(en.length).toBeGreaterThan(40);
      expect(el.length).toBeGreaterThan(40);
      expect(en).not.toBe(el);
    }
  });

  it('does not collapse non-direct modes onto the direct template', () => {
    const direct = offlineAgentReply('supply', 'direct', 'en');
    expect(offlineAgentReply('supply', 'exam-coach', 'en')).not.toBe(direct);
    expect(offlineAgentReply('supply', 'oral-exam', 'en')).not.toBe(direct);
    expect(offlineAgentReply('supply', 'memory-coach', 'en')).not.toBe(direct);
  });
});
