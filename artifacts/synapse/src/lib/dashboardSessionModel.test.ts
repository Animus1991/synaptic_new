import { describe, expect, it } from 'vitest';
import {
  buildDashboardSessionContent,
  buildDashboardToolActivity,
  filterDashboardToolActivity,
  filterDashboardWeakSpots,
  suggestDashboardFocusTool,
} from './dashboardSessionModel';
import { recordConceptActivity } from './workspaceConceptBus';

describe('dashboardSessionModel', () => {
  it('builds generic-concept session metadata with tool activity', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Introduction', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Introduction', 'quiz', 'quiz-wrong');

    const session = buildDashboardSessionContent({
      concept: 'Introduction',
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
      conceptMastery: 35,
      weakSpotCount: 2,
      leitnerDueCount: 0,
      reviewsDue: 1,
      conceptBus: bus,
    });

    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.weakSpotCount).toBe(2);
    expect(session.toolActivityCount).toBe(2);
    expect(session.engagedToolCount).toBe(2);
    expect(session.suggestFocusTool).toBe('reader');
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildDashboardSessionContent({
      concept: 'Elasticity',
      hasSource: false,
      conceptMastery: 50,
      weakSpotCount: 0,
    });

    expect(session.hasSource).toBe(false);
    expect(session.weakExtraction).toBe(true);
    expect(session.suggestFocusTool).toBeNull();
  });

  it('suggests focus tools and filters weak spots / activity', () => {
    expect(suggestDashboardFocusTool({ leitnerDueCount: 3, weakSpotCount: 2, reviewsDue: 1, conceptMastery: 50 }))
      .toBe('leitner');
    expect(suggestDashboardFocusTool({ leitnerDueCount: 0, weakSpotCount: 2, reviewsDue: 1, conceptMastery: 50 }))
      .toBe('reader');
    expect(suggestDashboardFocusTool({ leitnerDueCount: 0, weakSpotCount: 0, reviewsDue: 2, conceptMastery: 50 }))
      .toBe('quiz');
    expect(suggestDashboardFocusTool({ leitnerDueCount: 0, weakSpotCount: 0, reviewsDue: 0, conceptMastery: 20 }))
      .toBe('feynman');

    const spots = [
      { concept: 'Elasticity', mastery: 30, course: 'Econ 101' },
      { concept: 'Supply', mastery: 45, course: 'Econ 101' },
    ];
    expect(filterDashboardWeakSpots(spots, 'elastic')).toHaveLength(1);

    const activity = [
      { tool: 'reader' as const, count: 2, lastAt: 1 },
      { tool: 'quiz' as const, count: 1, lastAt: 2 },
    ];
    expect(filterDashboardToolActivity(activity, 'quiz')).toHaveLength(1);
  });

  it('buildDashboardToolActivity aggregates deliberate toolHitCounts for Progress panel', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Tariffs', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Tariffs', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Tariffs', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Tariffs', 'reader', 'focus');

    const activity = buildDashboardToolActivity(bus);
    expect(activity.find((row) => row.tool === 'reader')?.count).toBe(2);
    expect(activity.find((row) => row.tool === 'quiz')?.count).toBe(1);
    expect(activity.some((row) => row.tool === 'reader' && row.count === 3)).toBe(false);

    const session = buildDashboardSessionContent({
      concept: 'Tariffs',
      hasSource: true,
      conceptMastery: 55,
      weakSpotCount: 1,
      conceptBus: bus,
    });
    expect(session.toolActivityCount).toBe(3);
    expect(session.engagedToolCount).toBe(2);
  });
});
