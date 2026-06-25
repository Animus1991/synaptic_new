import { describe, expect, it, beforeEach } from 'vitest';
import { emitWorkspaceConceptEvent } from './emitLearningEvent';
import { listLearningEvents } from './learningEvents';
import { listCorrelationEvents, weakConceptKeysFromBus, toolActivityTotal } from './workspaceCorrelationEvents';
import { selectWeakConcepts, selectNextBestAction, selectToolActivity } from './workspaceSelectors';

describe('emitLearningEvent unified path', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('synapse:learning-events-v1');
      localStorage.removeItem('synapse:workspace-correlation-events-v1');
    } catch {
      /* node env */
    }
  });

  it('store-level fan-out: quiz wrong → bus, event, weak spots, tool chips, next action', () => {
    const result = emitWorkspaceConceptEvent(
      {
        conceptId: 'Comparative advantage',
        tool: 'quiz',
        signal: 'quiz-wrong',
        confidence: 0.8,
        sectionId: 'Trade theory',
        courseId: 'c-micro',
      },
      {},
    );

    expect('event' in result).toBe(true);
    if ('event' in result) {
      expect(result.event.type).toBe('quiz.answered');
      expect(result.event.payload?.correct).toBe(false);
    }

    const bus = result.conceptBus;
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

    const stored = listCorrelationEvents();
    if (stored.length > 0) {
      expect(stored[0]?.type).toBe('quiz.answered');
      const analytics = listLearningEvents();
      expect(analytics.some((e) => e.type === 'quiz_attempted')).toBe(true);
    }
  });

  it('confusion.marked fans out to bus; analytics via workspace_correlated when stored', () => {
    const result = emitWorkspaceConceptEvent(
      {
        conceptId: 'Tariffs',
        tool: 'annotations',
        signal: 'annotated-confusing',
        confidence: 0.6,
      },
      {},
    );
    expect('event' in result).toBe(true);
    if ('event' in result) {
      expect(result.event.type).toBe('confusion.marked');
    }
    expect(weakConceptKeysFromBus(result.conceptBus)).toContain('Tariffs');
    const analytics = listLearningEvents();
    if (analytics.length > 0) {
      expect(analytics[0]?.type).toBe('workspace_correlated');
    }
  });
});
