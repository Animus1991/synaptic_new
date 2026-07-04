import { describe, expect, it } from 'vitest';
import { buildProactiveAgentAlerts } from './proactiveAgentAlerts';
import { mockLearnerModel } from '../demo/mockData';
import type { ActivityItem, LearnerModel } from '../types';

describe('proactiveAgentAlerts', () => {
  it('surfaces forgetting-risk for low FSRS retrievability', () => {
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [
        {
          concept: 'Elasticity',
          interval: 1,
          nextReview: '2026-06-20T00:00:00.000Z',
          stability: 0.35,
          difficulty: 0.8,
          reviewCount: 4,
        },
      ],
    };
    const alerts = buildProactiveAgentAlerts({
      lang: 'en',
      learnerModel: lm,
      activities: [],
      now: new Date('2026-07-04T12:00:00.000Z'),
    });
    expect(alerts.some((a) => a.kind === 'forgetting-risk' && a.concept === 'Elasticity')).toBe(true);
    expect(alerts[0]?.action.type).toBe('workspace');
  });

  it('surfaces quiz fail streak alert routing to feynman', () => {
    const activities: ActivityItem[] = [
      { id: '1', type: 'quiz_failed', description: 'Missed quiz on Tariffs', timestamp: '2026-07-04T12:00:00Z' },
      { id: '2', type: 'quiz_failed', description: 'Missed quiz on Tariffs', timestamp: '2026-07-04T11:00:00Z' },
      { id: '3', type: 'quiz_failed', description: 'Missed quiz on Tariffs', timestamp: '2026-07-04T10:00:00Z' },
    ];
    const alerts = buildProactiveAgentAlerts({
      lang: 'en',
      learnerModel: mockLearnerModel,
      activities,
    });
    const gap = alerts.find((a) => a.kind === 'quiz-fail-streak');
    expect(gap?.concept).toBe('Tariffs');
    expect(gap?.action).toMatchObject({ type: 'workspace', tool: 'feynman' });
  });

  it('limits to maxAlerts', () => {
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [
        {
          concept: 'A',
          interval: 1,
          nextReview: '2026-07-01T00:00:00.000Z',
          stability: 0.5,
          difficulty: 0.8,
          reviewCount: 2,
        },
        {
          concept: 'B',
          interval: 1,
          nextReview: '2026-07-01T00:00:00.000Z',
          stability: 0.5,
          difficulty: 0.8,
          reviewCount: 2,
        },
        {
          concept: 'C',
          interval: 1,
          nextReview: '2026-07-01T00:00:00.000Z',
          stability: 0.5,
          difficulty: 0.8,
          reviewCount: 2,
        },
        {
          concept: 'D',
          interval: 1,
          nextReview: '2026-07-01T00:00:00.000Z',
          stability: 0.5,
          difficulty: 0.8,
          reviewCount: 2,
        },
      ],
    };
    const alerts = buildProactiveAgentAlerts({
      lang: 'en',
      learnerModel: lm,
      activities: [],
      now: new Date('2026-07-04T12:00:00.000Z'),
      maxAlerts: 2,
    });
    expect(alerts).toHaveLength(2);
  });
});
