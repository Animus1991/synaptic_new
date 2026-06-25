import { describe, expect, it } from 'vitest';
import { applySpacedStepBoost, isStepDue, recordStepVisit } from './spacedStepSchedule';

describe('spacedStepSchedule', () => {
  const steps = [
    { title: 'Core', type: 'Concept' },
    { title: 'Practice', type: 'Practice' },
    { title: 'Quiz', type: 'Knowledge Check' },
  ];

  it('marks never-visited steps as due', () => {
    const { dueIndices } = applySpacedStepBoost(steps, {});
    expect(dueIndices.length).toBeGreaterThan(0);
  });

  it('extends interval after visit when mastery is high', () => {
    const key = `test-scope-${Date.now()}`;
    const entry = recordStepVisit(key, 0, 80);
    expect(isStepDue(entry)).toBe(false);
    expect(entry.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it('keeps quiz step last after spaced boost', () => {
    const { steps: ordered } = applySpacedStepBoost(steps, {});
    expect(ordered[ordered.length - 1]?.type).toMatch(/quiz|knowledge check/i);
  });
});
