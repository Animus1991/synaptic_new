import { describe, expect, it } from 'vitest';
import { recommendToolsForStep } from './workspaceStepTools';

describe('workspaceStepTools', () => {
  it('maps quiz step to leitner', () => {
    expect(recommendToolsForStep({ title: 'Check', type: 'Quiz' }, 4, 5)).toContain('leitner');
  });

  it('maps practice to scratchpad', () => {
    expect(recommendToolsForStep({ title: 'Example', type: 'Practice' }, 2, 5)[0]).toBe('scratchpad');
  });
});
