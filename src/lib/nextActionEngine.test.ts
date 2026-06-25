import { describe, expect, it } from 'vitest';
import { recommendNextAction, nextActionLabel } from './nextActionEngine';

describe('nextActionEngine', () => {
  it('prioritizes reprocess when source quality is low', () => {
    const rec = recommendNextAction({
      lang: 'el',
      hasSource: true,
      sourceQuality: 37,
      showMigration: false,
      showLowQuality: true,
      stepIndex: 3,
      stepCount: 8,
      quizPassed: false,
      weakConceptCount: 0,
    });
    expect(rec?.primary).toBe('reprocess');
    expect(rec?.reason).toContain('37');
  });

  it('recommends study section when section not yet marked', () => {
    const rec = recommendNextAction({
      lang: 'en',
      hasSource: true,
      sourceQuality: 80,
      showMigration: false,
      showLowQuality: false,
      stepIndex: 2,
      stepCount: 8,
      quizPassed: false,
      weakConceptCount: 0,
    });
    expect(rec?.primary).toBe('study-section');
  });

  it('recommends test me after section understood', () => {
    const rec = recommendNextAction({
      lang: 'el',
      hasSource: true,
      sourceQuality: 80,
      showMigration: false,
      showLowQuality: false,
      stepIndex: 2,
      stepCount: 8,
      stepMark: 'understood',
      quizPassed: false,
      weakConceptCount: 0,
    });
    expect(rec?.primary).toBe('test-me');
  });

  it('recommends explain from zero when confusing', () => {
    const rec = recommendNextAction({
      lang: 'en',
      hasSource: true,
      sourceQuality: 80,
      showMigration: false,
      showLowQuality: false,
      stepIndex: 1,
      stepCount: 8,
      stepMark: 'confusing',
      quizPassed: false,
      weakConceptCount: 0,
    });
    expect(rec?.primary).toBe('explain-zero');
  });

  it('labels reprocess action in Greek', () => {
    expect(nextActionLabel('reprocess', 'el')).toContain('επανεπεξεργασίας');
  });
});
