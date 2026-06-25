import { describe, it, expect } from 'vitest';
import { evaluateAll, evaluateFixture } from './evalHarness';

describe('recognition eval harness', () => {
  it('evaluates the physics fixture', () => {
    const result = evaluateFixture('physics.md');
    expect(result.fixture).toBe('physics.md');
    expect(result.conceptRecall).toBeGreaterThan(0);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('evaluates the law fixture', () => {
    const result = evaluateFixture('law.md');
    expect(result.fixture).toBe('law.md');
    expect(result.conceptRecall).toBeGreaterThan(0);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('aggregates a multi-fixture report', () => {
    const report = evaluateAll(['physics.md', 'law.md']);
    expect(report.results).toHaveLength(2);
    expect(report.averageConceptRecall).toBeGreaterThanOrEqual(0.6);
    expect(report.results.every((r) => r.conceptRecall >= 0.6)).toBe(true);
    expect(report.pass).toBe(true);
  });
});
