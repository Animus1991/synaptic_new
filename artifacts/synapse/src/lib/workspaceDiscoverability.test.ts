import { describe, expect, it } from 'vitest';
import {
  buildCorrelationChips,
  buildDiscoverabilitySummary,
  buildToolFeatureGuide,
} from './workspaceDiscoverability';
import { buildWorkspaceCorrelation } from './workspaceCorrelation';
import type { WorkspaceSourceIntelligence } from './workspaceNoteContent';

function sampleSourceIntel(overrides: Partial<WorkspaceSourceIntelligence> = {}): WorkspaceSourceIntelligence {
  return {
    score: 80,
    band: 'strong',
    bestTool: 'reader',
    bestToolReason: 'Read first',
    strengths: [],
    gaps: [],
    nextActions: [],
    metrics: {
      passageCount: 2,
      avgPassageRelevance: 0.7,
      sectionCount: 3,
      definitionCount: 1,
      glossaryCount: 2,
      workedExampleCount: 0,
      formulaCount: 0,
      comparisonCount: 0,
      conceptNodeCount: 1,
      stepCount: 4,
    },
    documentStructure: null,
    ...overrides,
  };
}

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
    expect(summary.nextAction).toBeNull();
  });

  it('syncs subline and recommended tool from next action engine (Wave 5C)', () => {
    const summary = buildDiscoverabilitySummary(
      true,
      sampleSourceIntel({ score: 82, bestTool: 'feynman', bestToolReason: 'Try Feynman' }),
      sampleCorrelation(),
      'reader',
      'en',
      {
        primary: 'test-me',
        reason: 'Section marked clear — verify with a quick check.',
        secondary: ['flashcards'],
      },
    );
    expect(summary.subline).toContain('verify');
    expect(summary.recommendedTool).toBe('quiz');
    expect(summary.nextAction?.primary).toBe('test-me');
    expect(summary.toolGuide.quickActionIds[0]).toBe('jump-quiz');
  });
});
