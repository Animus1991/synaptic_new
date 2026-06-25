import { describe, expect, it } from 'vitest';
import { buildConceptBusRows, buildToolActivityBreakdown } from './conceptBusPanelModel';
import { isDeliberateConceptSignal, recordConceptActivity } from './workspaceConceptBus';

describe('conceptBusPanelModel', () => {
  it('builds rows with tool correlation ordered by recency', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Supply', 'leitner', 'leitner-hard');

    const rows = buildConceptBusRows(bus, 'Elasticity');
    expect(rows).toHaveLength(2);
    const elasticity = rows.find((r) => r.concept === 'Elasticity');
    const supply = rows.find((r) => r.concept === 'Supply');
    expect(elasticity?.isFocus).toBe(true);
    expect(elasticity?.tools).toEqual(['reader', 'quiz']);
    expect(elasticity?.struggling).toBe(true);
    expect(supply?.tools).toEqual(['leitner']);
  });

  it('builds per-tool activity breakdown for Progress panel', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Elasticity', 'reader', 'read');
    bus = recordConceptActivity(bus, 'Supply', 'leitner', 'leitner-hard');

    const breakdown = buildToolActivityBreakdown(bus);
    const reader = breakdown.find((b) => b.tool === 'reader');
    const quiz = breakdown.find((b) => b.tool === 'quiz');
    expect(reader?.count).toBe(2);
    expect(quiz?.count).toBe(1);
    expect(breakdown.some((b) => b.tool === 'leitner')).toBe(true);
  });

  it('excludes passive focus signals from tool activity breakdown', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'reader', 'focus');
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    const breakdown = buildToolActivityBreakdown(bus);
    expect(breakdown.find((b) => b.tool === 'reader')).toBeUndefined();
    expect(breakdown.find((b) => b.tool === 'quiz')?.count).toBe(1);
    expect(isDeliberateConceptSignal('focus')).toBe(false);
    expect(isDeliberateConceptSignal('quiz-wrong')).toBe(true);
  });
});
