import { describe, it, expect } from 'vitest';
import { buildConceptRemediationMatrix } from './conceptBusRemediation';
import { buildConceptBusRows, rowFromActivity } from './conceptBusPanelModel';
import { recordConceptActivity } from './workspaceConceptBus';

describe('conceptBusRemediation', () => {
  it('prioritizes quiz remediation after quiz-wrong', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    const row = buildConceptBusRows(bus)[0]!;
    const actions = buildConceptRemediationMatrix(row, 'en');
    expect(actions[0]?.id).toBe('quiz');
    expect(actions.some((a) => a.id === 'flashcards')).toBe(true);
  });

  it('suggests flashcards after leitner-hard', () => {
    const row = rowFromActivity({
      concept: 'Supply',
      key: 'supply',
      tools: ['leitner'],
      signals: ['leitner-hard'],
      firstAt: 1,
      lastAt: 2,
      struggleScore: 1,
      toolHitCounts: { leitner: 1 },
    });
    const actions = buildConceptRemediationMatrix(row, 'en');
    expect(actions[0]?.id).toBe('flashcards');
  });
});
