import { describe, it, expect } from 'vitest';
import { buildDashboardWeakSpots, buildDashboardWeakSpotCards } from './dashboardWeakSpotsModel';
import { enrichWeakSpotsWithReasons } from './weakAreaReasons';
import { recordConceptActivity } from './workspaceConceptBus';

describe('dashboardWeakSpotsModel', () => {
  it('builds weak spot cards with reasons from learner model', () => {
    const cards = buildDashboardWeakSpotCards(
      [{ concept: 'Tariffs', mastery: 35 }],
      'en',
    );
    expect(cards[0]?.reasons.length).toBeGreaterThan(0);
  });

  it('attaches remediation actions from concept bus', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Tariffs', 'quiz', 'quiz-wrong');
    const spots = enrichWeakSpotsWithReasons(
      [{ concept: 'Tariffs', mastery: 35, course: 'Econ', source: 'bus' }],
      bus,
      'en',
    );
    const enriched = buildDashboardWeakSpots(spots, bus, 'en');
    expect(enriched[0]?.remediation.length).toBeGreaterThan(0);
    expect(enriched[0]?.remediation.some((a) => a.id === 'quiz')).toBe(true);
  });

  it('falls back to remediation for model-only weak spots', () => {
    const spots = enrichWeakSpotsWithReasons(
      [{ concept: 'Supply', mastery: 30, course: 'Econ', source: 'model' }],
      {},
      'en',
    );
    const enriched = buildDashboardWeakSpots(spots, {}, 'en');
    expect(enriched[0]?.remediation.length).toBeGreaterThan(0);
    expect(enriched[0]?.reasons.some((r) => r.id === 'low-mastery')).toBe(true);
  });
});
