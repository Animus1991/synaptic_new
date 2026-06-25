import { describe, expect, it } from 'vitest';
import { buildAgentPromptForSection, getLearningActions } from './workspaceLearningActions';

describe('workspaceLearningActions', () => {
  it('returns bilingual action sets', () => {
    expect(getLearningActions('en').find((a) => a.id === 'study-section')?.label).toBe('Study section');
    expect(getLearningActions('el').find((a) => a.id === 'test-me')?.label).toBe('Δοκίμασέ με');
  });

  it('builds grounded agent prompts', () => {
    const el = buildAgentPromptForSection('explain-zero', 'ΔΙΑΛΕΞΗ 1', 'Trade', 'el');
    expect(el).toContain('ΔΙΑΛΕΞΗ 1');
    expect(el).toContain('σημειώσεων');
  });
});
