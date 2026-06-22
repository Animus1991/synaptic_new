import { describe, expect, it } from 'vitest';
import {
  buildCorrelationChips,
  buildDiscoverabilitySummary,
  buildToolFeatureGuide,
} from './workspaceDiscoverability';
import { buildWorkspaceCorrelation } from './workspaceCorrelation';

function sampleCorrelation(overrides: Partial<ReturnType<typeof buildWorkspaceCorrelation>> = {}) {
  return buildWorkspaceCorrelation({
    progressKey: 'p1',
    concept: 'elasticity',
    conceptMastery: 55,
    stepIndex: 0,
    stepCount: 4,
    focusTerm: 'Price Elasticity',
    leitnerDueCount: 2,
    quizAbility: 0.35,
    ...overrides,
  });
}

describe('workspaceDiscoverability', () => {
  it('builds active correlation chips from bus state', () => {
    const chips = buildCorrelationChips(sampleCorrelation(), 'en');
    expect(chips.find((c) => c.id === 'mastery')?.active).toBe(true);
    expect(chips.find((c) => c.id === 'leitner')?.value).toContain('2');
  });

  it('lists W8 features for reader tool guide', () => {
    const guide = buildToolFeatureGuide('reader', 'en');
    expect(guide.features.some((f) => /OCR overlay/i.test(f))).toBe(true);
  });

  it('returns upload headline when not grounded', () => {
    const summary = buildDiscoverabilitySummary(
      false,
      null,
      sampleCorrelation({ conceptMastery: 0, focusTerm: undefined, leitnerDueCount: 0 }),
      'reader',
      'en',
    );
    expect(summary.grounded).toBe(false);
    expect(summary.headline).toMatch(/upload/i);
  });
});
