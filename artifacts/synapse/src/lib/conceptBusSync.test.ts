import { describe, expect, it } from 'vitest';
import {
  collectConceptBusInsights,
  countSpacedStepReviewsDue,
  enrichLearnerModelFromConceptBus,
  mergeAllConceptBuses,
  mergeAllStepSchedules,
  mergeDashboardReviewsDue,
} from './conceptBusSync';
import { recordConceptActivity, type ConceptBusState } from './workspaceConceptBus';
import type { StepScheduleEntry } from './spacedStepSchedule';
import { createEmptyLearnerModel } from './emptyLearnerState';

describe('conceptBusSync', () => {
  it('merges concept buses across scopes without losing signals', () => {
    const local = {
      'task-a': recordConceptActivity({}, 'Elasticity', 'quiz', 'quiz-wrong', 1),
    };
    const remote = {
      'task-a': recordConceptActivity({}, 'Elasticity', 'feynman', 'explained', 2),
      'task-b': recordConceptActivity({}, 'Supply', 'reader', 'read', 3),
    };
    const merged = mergeAllConceptBuses(local, remote);
    expect(Object.keys(merged)).toEqual(['task-a', 'task-b']);
    const a = merged['task-a']!['elasticity']!;
    expect(a.tools).toEqual(expect.arrayContaining(['quiz', 'feynman']));
    expect(a.signals.length).toBe(2);
  });

  it('merges step schedules keeping earliest due date', () => {
    const entryA: StepScheduleEntry = {
      lastVisitedAt: '2026-01-01T00:00:00.000Z',
      visitCount: 2,
      intervalDays: 3,
      easeFactor: 2.2,
      nextDueAt: '2026-01-05T00:00:00.000Z',
    };
    const entryB: StepScheduleEntry = {
      lastVisitedAt: '2026-01-02T00:00:00.000Z',
      visitCount: 3,
      intervalDays: 4,
      easeFactor: 2.4,
      nextDueAt: '2026-01-04T00:00:00.000Z',
    };
    const merged = mergeAllStepSchedules({ scope: { 0: entryA } }, { scope: { 0: entryB } });
    expect(merged.scope[0]!.nextDueAt).toBe('2026-01-04T00:00:00.000Z');
    expect(merged.scope[0]!.visitCount).toBe(3);
  });

  it('collects struggling insights and enriches learner model + spacing', () => {
    let bus: ConceptBusState = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong', 1);
    bus = recordConceptActivity(bus, 'Elasticity', 'leitner', 'leitner-hard', 2);
    const insights = collectConceptBusInsights({ ws: bus }, () => 35);
    expect(insights.some((i) => i.struggling)).toBe(true);

    const enriched = enrichLearnerModelFromConceptBus(createEmptyLearnerModel(), { ws: bus });
    expect(enriched.weakAreas.some((w) => /elasticity/i.test(w.concept))).toBe(true);
    expect(enriched.spacingIntervals.some((s) => /elasticity/i.test(s.concept))).toBe(true);
  });

  it('counts due spaced steps for dashboard reviewsDue merge', () => {
    const past = new Date('2020-01-01').toISOString();
    const schedules = {
      a: {
        0: {
          lastVisitedAt: past,
          visitCount: 1,
          intervalDays: 1,
          easeFactor: 2,
          nextDueAt: past,
        },
      },
    };
    expect(countSpacedStepReviewsDue(schedules)).toBe(1);
    expect(mergeDashboardReviewsDue(2, schedules)).toBe(2);
    expect(mergeDashboardReviewsDue(0, schedules)).toBe(1);
  });
});
