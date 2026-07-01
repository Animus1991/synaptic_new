import { describe, expect, it } from 'vitest';
import { inferBehaviorFromActivities, applyBehaviorInference } from './behaviorInference';
import type { ActivityItem } from '../types';
import type { LearningEvent } from './learningEvents';

function act(type: ActivityItem['type'], description: string, hour: number): ActivityItem {
  const d = new Date();
  d.setHours(hour, 30, 0, 0);
  return {
    id: `a-${Math.random()}`,
    type,
    description,
    timestamp: d.toISOString(),
  };
}

describe('inferBehaviorFromActivities', () => {
  it('infers best study time bucket from productive hours', () => {
    const activities = [
      ...Array.from({ length: 4 }, () => act('quiz_passed', 'Passed quiz on tariffs', 10)),
      act('quiz_failed', 'Missed quiz on GDP', 22),
    ];
    const result = inferBehaviorFromActivities(activities);
    expect(result.bestTimeOfDay).toBe('09:00–12:00');
    expect(result.inferenceConfidence).toBe('medium');
  });

  it('computes help-seeking from agent_message events', () => {
    const events: LearningEvent[] = [
      {
        id: 'e1',
        type: 'agent_message',
        timestamp: new Date().toISOString(),
        payload: { isHint: true },
      },
      {
        id: 'e2',
        type: 'agent_message',
        timestamp: new Date().toISOString(),
        payload: { isHint: false },
      },
    ];
    const activities = [act('quiz_passed', 'Passed quiz on elasticity', 14)];
    const result = inferBehaviorFromActivities(activities, events);
    expect(result.helpSeekingRate).toBeGreaterThan(0);
    expect(result.helpSeekingRate).toBeLessThanOrEqual(1);
  });

  it('computes persistence from failure followed by recovery', () => {
    const base = new Date('2026-06-01T10:00:00Z');
    const activities: ActivityItem[] = [
      { id: '1', type: 'quiz_failed', description: 'Missed quiz on X', timestamp: base.toISOString() },
      {
        id: '2',
        type: 'quiz_passed',
        description: 'Passed quiz on X',
        timestamp: new Date(base.getTime() + 3600_000).toISOString(),
      },
    ];
    const result = inferBehaviorFromActivities(activities);
    expect(result.persistenceScore).toBe(1);
  });

  it('infers cognitive load from session lengths', () => {
    const activities = [
      act('study_time', 'Focus: 15 min', 9),
      act('study_time', 'Focus: 12 min', 10),
    ];
    const result = inferBehaviorFromActivities(activities);
    expect(result.cognitiveLoadPreference).toBe('low');
    expect(result.averageSessionLength).toBe(14);
  });
});

describe('applyBehaviorInference', () => {
  it('merges inference into learner model fields', () => {
    const base = {
      bestTimeOfDay: '',
      cognitiveLoadPreference: 'medium' as const,
      transferAbility: 0,
      helpSeekingRate: 0,
      persistenceScore: 0,
      retrievalPerformance: 0,
      averageSessionLength: 25,
      preferredSessionLength: 25,
      totalStudyTime: 0,
      totalSessions: 0,
    };
    const inference = inferBehaviorFromActivities([
      act('quiz_passed', 'Passed quiz on trade', 10),
    ]);
    const merged = applyBehaviorInference(base, inference);
    expect(merged.helpSeekingRate).toBeGreaterThanOrEqual(0);
  });
});
