import { describe, it, expect } from 'vitest';
import { buildWeakAreaReasons, enrichWeakSpotsWithReasons } from './weakAreaReasons';
import { recordConceptActivity } from './workspaceConceptBus';

describe('weakAreaReasons', () => {
  it('counts quiz-wrong signals', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Tariffs', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Tariffs', 'quiz', 'quiz-wrong');
    const reasons = buildWeakAreaReasons('Tariffs', bus, 'en');
    expect(reasons.some((r) => r.id === 'quiz-wrong' && r.label.includes('2'))).toBe(true);
  });

  it('includes low mastery reason', () => {
    const reasons = buildWeakAreaReasons('X', {}, 'en', { mastery: 30, source: 'model' });
    expect(reasons.some((r) => r.id === 'low-mastery')).toBe(true);
  });

  it('enriches weak spots with reasons', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'leitner', 'leitner-hard');
    const enriched = enrichWeakSpotsWithReasons(
      [{ concept: 'Elasticity', mastery: 40, course: 'Econ', source: 'bus' }],
      bus,
      'el',
    );
    expect(enriched[0]?.reasons.length).toBeGreaterThan(0);
  });
});
