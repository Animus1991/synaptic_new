import { describe, expect, it } from 'vitest';
import { orderStepsByMastery, resolveConceptMastery } from './workspaceCorrelation';

describe('workspaceCorrelation', () => {
  it('resolves mastery from concept bars', () => {
    expect(resolveConceptMastery('elasticity', [{ concept: 'Price Elasticity', mastery: 42 }])).toBe(42);
  });

  it('puts quiz last and weak topics first', () => {
    const steps = [
      { title: 'Strong topic', type: 'Core Concept' },
      { title: 'Weak area', type: 'Deep Dive' },
      { title: 'Check', type: 'Quiz' },
    ];
    const ordered = orderStepsByMastery(steps, 'elasticity', 40, [
      { concept: 'Weak area', mastery: 20 },
      { concept: 'Strong topic', mastery: 90 },
    ]);
    expect(ordered[ordered.length - 1]?.type).toMatch(/quiz/i);
    expect(ordered[0]?.title).toBe('Weak area');
  });
});
