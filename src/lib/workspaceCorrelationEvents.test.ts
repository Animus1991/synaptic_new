import { describe, expect, it, beforeEach } from 'vitest';
import {
  appendCorrelationEvent,
  weakConceptKeysFromBus,
  toolActivityTotal,
} from './workspaceCorrelationEvents';
import { selectWeakConcepts, selectNextBestAction, selectToolActivity } from './workspaceSelectors';
import { recommendNextAction } from './nextActionEngine';

describe('workspaceCorrelationEvents', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('synapse:workspace-correlation-events-v1');
    } catch {
      /* node env */
    }
  });

  it('fan-out: quiz.answered incorrect updates bus, weak spots, tool activity, next action', () => {
    let bus = {};
    const { conceptBus } = appendCorrelationEvent(
      {
        type: 'quiz.answered',
        conceptId: 'Comparative advantage',
        toolId: 'quiz',
        confidence: 0.8,
        payload: { correct: false },
      },
      bus,
    );
    bus = conceptBus;

    expect(weakConceptKeysFromBus(bus)).toContain('Comparative advantage');
    expect(toolActivityTotal(bus, 'quiz')).toBeGreaterThanOrEqual(1);

    const weak = selectWeakConcepts(undefined, [], bus, 'Micro II');
    expect(weak.some((w) => w.concept === 'Comparative advantage')).toBe(true);

    const chips = selectToolActivity(bus);
    expect(chips.some((c) => c.tool === 'quiz' && c.count >= 1)).toBe(true);

    const next = selectNextBestAction({
      lang: 'en',
      hasSource: true,
      sourceQuality: 80,
      showMigration: false,
      showLowQuality: false,
      stepIndex: 2,
      stepCount: 8,
      stepMark: 'confusing',
      quizPassed: false,
      weakConceptCount: weak.length,
    });
    expect(next?.primary).toBe('explain-zero');
  });

  it('confusion.marked creates struggle signal', () => {
    const { conceptBus } = appendCorrelationEvent(
      {
        type: 'confusion.marked',
        conceptId: 'Tariffs',
        toolId: 'annotations',
        confidence: 0.6,
      },
      {},
    );
    expect(weakConceptKeysFromBus(conceptBus)).toContain('Tariffs');
  });
});

describe('selectNextBestAction', () => {
  it('delegates to recommendNextAction for low quality', () => {
    const direct = recommendNextAction({
      lang: 'el',
      hasSource: true,
      sourceQuality: 37,
      showMigration: false,
      showLowQuality: true,
      stepIndex: 0,
      stepCount: 8,
      quizPassed: false,
      weakConceptCount: 0,
    });
    const viaSelector = selectNextBestAction({
      lang: 'el',
      hasSource: true,
      sourceQuality: 37,
      showMigration: false,
      showLowQuality: true,
      stepIndex: 0,
      stepCount: 8,
      quizPassed: false,
      weakConceptCount: 0,
    });
    expect(viaSelector).toEqual(direct);
    expect(viaSelector?.primary).toBe('reprocess');
  });
});
