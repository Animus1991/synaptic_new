import { describe, expect, it } from 'vitest';
import {
  applyNextActionToDiscoverability,
  discoverabilityActionFromNextAction,
  recommendedToolFromNextAction,
} from './discoverabilityNextActionSync';

describe('discoverabilityNextActionSync', () => {
  it('maps test-me to quiz tool', () => {
    expect(recommendedToolFromNextAction('test-me', 'feynman')).toBe('quiz');
  });

  it('maps flashcards to leitner', () => {
    expect(recommendedToolFromNextAction('flashcards', null)).toBe('leitner');
  });

  it('maps study-section to reader quick action', () => {
    expect(discoverabilityActionFromNextAction('study-section')).toBe('open-reader-focus');
  });

  it('overrides subline and prepends aligned quick action', () => {
    const result = applyNextActionToDiscoverability({
      nextAction: {
        primary: 'test-me',
        reason: 'Verify understanding',
        secondary: ['flashcards'],
      },
      sourceBestTool: 'feynman',
      subline: 'Old reason',
      quickActionIds: ['open-reader-focus'],
    });
    expect(result.subline).toBe('Verify understanding');
    expect(result.recommendedTool).toBe('quiz');
    expect(result.quickActionIds[0]).toBe('jump-quiz');
    expect(result.nextAction?.primary).toBe('test-me');
  });

  it('falls back when next action is absent', () => {
    const result = applyNextActionToDiscoverability({
      nextAction: null,
      sourceBestTool: 'compare',
      subline: 'Bus reason',
      quickActionIds: ['open-compare'],
    });
    expect(result.subline).toBe('Bus reason');
    expect(result.recommendedTool).toBe('compare');
    expect(result.nextAction).toBeNull();
  });
});
