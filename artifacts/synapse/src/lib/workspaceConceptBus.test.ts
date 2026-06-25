import { describe, it, expect } from 'vitest';
import {
  recordConceptActivity,
  conceptEngagement,
  isStruggling,
  isConfident,
  recentConcepts,
  topEngagedConcepts,
  activityFor,
  type ConceptBusState,
  type ConceptActivity,
} from './workspaceConceptBus';

describe('workspaceConceptBus', () => {
  it('de-duplicates concepts by normalized key and merges tools/signals', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Marginal Cost', 'reader', 'read', 1);
    state = recordConceptActivity(state, '  marginal   cost ', 'concept-map', 'mapped', 2);
    const a = activityFor(state, 'MARGINAL COST');
    expect(a).toBeDefined();
    expect(a!.tools).toEqual(['reader', 'concept-map']);
    expect(a!.signals).toEqual(['read', 'mapped']);
    expect(a!.lastTool).toBe('concept-map');
    expect(a!.lastAt).toBe(2);
  });

  it('does not duplicate the same tool in the tools list', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Elasticity', 'quiz', 'quiz-correct', 1);
    state = recordConceptActivity(state, 'Elasticity', 'quiz', 'quiz-wrong', 2);
    expect(activityFor(state, 'Elasticity')!.tools).toEqual(['quiz']);
    expect(activityFor(state, 'Elasticity')!.signals).toHaveLength(2);
  });

  it('ignores empty concepts', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, '   ', 'reader', 'read', 1);
    expect(Object.keys(state)).toHaveLength(0);
  });

  it('engagement grows with tool breadth and signal depth', () => {
    let narrow: ConceptBusState = {};
    narrow = recordConceptActivity(narrow, 'X', 'reader', 'read', 1);

    let broad: ConceptBusState = {};
    broad = recordConceptActivity(broad, 'Y', 'reader', 'read', 1);
    broad = recordConceptActivity(broad, 'Y', 'concept-map', 'mapped', 2);
    broad = recordConceptActivity(broad, 'Y', 'quiz', 'quiz-correct', 3);
    broad = recordConceptActivity(broad, 'Y', 'feynman', 'explained', 4);

    expect(conceptEngagement(broad['y']!)).toBeGreaterThan(conceptEngagement(narrow['x']!));
    expect(conceptEngagement(broad['y']!)).toBeLessThanOrEqual(1);
  });

  it('flags struggle and confidence from real signals', () => {
    let struggle: ConceptBusState = {};
    struggle = recordConceptActivity(struggle, 'Hard', 'quiz', 'quiz-wrong', 1);
    struggle = recordConceptActivity(struggle, 'Hard', 'leitner', 'leitner-hard', 2);
    expect(isStruggling(struggle['hard']!)).toBe(true);
    expect(isConfident(struggle['hard']!)).toBe(false);

    let confident: ConceptBusState = {};
    confident = recordConceptActivity(confident, 'Easy', 'quiz', 'quiz-correct', 1);
    confident = recordConceptActivity(confident, 'Easy', 'feynman', 'explained', 2);
    expect(isConfident(confident['easy']!)).toBe(true);
    expect(isStruggling(confident['easy']!)).toBe(false);
  });

  it('treats annotated-confusing as a struggle signal', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Tariffs', 'annotations', 'annotated-confusing', 1);
    expect(isStruggling(activityFor(state, 'Tariffs')!)).toBe(true);
  });

  it('treats engagement-only signals (read/mapped/noted/annotated/simulated) as neutral', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Z', 'reader', 'read', 1);
    state = recordConceptActivity(state, 'Z', 'concept-map', 'mapped', 2);
    state = recordConceptActivity(state, 'Z', 'whiteboard', 'noted', 3);
    state = recordConceptActivity(state, 'Z', 'annotations', 'annotated', 4);
    state = recordConceptActivity(state, 'Z', 'simulator', 'simulated', 5);
    const a = activityFor(state, 'Z')!;
    expect(a.struggleScore).toBe(0);
    expect(isStruggling(a)).toBe(false);
    // Five distinct tools + five distinct signal types => saturated engagement.
    expect(conceptEngagement(a)).toBe(1);
    expect(a.tools).toEqual(['reader', 'concept-map', 'whiteboard', 'annotations', 'simulator']);
  });

  it('does not increment toolHitCounts for passive focus signals', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Nav', 'reader', 'focus', 1);
    state = recordConceptActivity(state, 'Nav', 'quiz', 'focus', 2);
    const a = activityFor(state, 'Nav')!;
    expect(a.tools).toEqual(['reader', 'quiz']);
    expect(a.toolHitCounts).toEqual({});
  });

  it('increments toolHitCounts only for deliberate learner actions', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'Act', 'quiz', 'quiz-wrong', 1);
    expect(state.act!.toolHitCounts.quiz).toBe(1);
    state = recordConceptActivity(state, 'Act', 'reader', 'focus', 2);
    expect(state.act!.toolHitCounts.quiz).toBe(1);
    expect(state.act!.toolHitCounts.reader).toBeUndefined();
  });

  it('records toolHitCounts on legacy persisted activity without toolHitCounts', () => {
    let state: ConceptBusState = {
      introduction: {
        concept: 'Introduction',
        key: 'introduction',
        tools: ['reader'],
        signals: ['read'],
        firstAt: 1,
        lastAt: 1,
        struggleScore: 0,
        toolHitCounts: undefined as unknown as ConceptActivity['toolHitCounts'],
      },
    };
    state = recordConceptActivity(state, 'Introduction', 'simulator', 'simulated', 2);
    expect(state.introduction!.toolHitCounts.simulator).toBe(1);
  });

  it('orders recent and top-engaged concepts correctly', () => {
    let state: ConceptBusState = {};
    state = recordConceptActivity(state, 'First', 'reader', 'read', 1);
    state = recordConceptActivity(state, 'Second', 'reader', 'read', 2);
    state = recordConceptActivity(state, 'Second', 'concept-map', 'mapped', 3);
    state = recordConceptActivity(state, 'Second', 'quiz', 'quiz-correct', 4);

    expect(recentConcepts(state)[0]!.concept).toBe('Second');
    expect(topEngagedConcepts(state)[0]!.concept).toBe('Second');
  });
});
