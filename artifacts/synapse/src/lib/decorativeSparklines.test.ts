import { describe, expect, it } from 'vitest';
import { buildRetentionSparklineItems, sparklinePath } from './decorativeSparklines';

describe('buildRetentionSparklineItems', () => {
  it('includes FSRS forecast series when provided', () => {
    const items = buildRetentionSparklineItems(
      [
        { dayOffset: 0, avgRetrievability: 0.9, dueCount: 1 },
        { dayOffset: 7, avgRetrievability: 0.7, dueCount: 3 },
      ],
      [],
      4,
    );
    expect(items[0]?.id).toBe('fsrs-avg');
    expect(items[0]?.values).toEqual([0.9, 0.7]);
  });

  it('adds skill decay sparklines sorted by lowest retention', () => {
    const items = buildRetentionSparklineItems(
      [],
      [
        {
          concept: 'Elasticity',
          courseId: 'c1',
          mastery: 60,
          lastPracticed: '2026-01-01',
          retentionPrediction: 40,
          practiceCount: 2,
          averageResponseTime: 10,
          errorRate: 0.2,
        },
        {
          concept: 'Supply',
          courseId: 'c1',
          mastery: 90,
          lastPracticed: '2026-01-02',
          retentionPrediction: 85,
          practiceCount: 5,
          averageResponseTime: 8,
          errorRate: 0.1,
        },
      ],
      4,
    );
    expect(items.some((i) => i.label === 'Elasticity')).toBe(true);
  });
});

describe('sparklinePath', () => {
  it('returns an SVG path for two or more values', () => {
    expect(sparklinePath([1, 0.5, 0.25], 80, 28)).toMatch(/^M[\d.,]+ L/);
  });
});
