import { describe, expect, it } from 'vitest';
import {
  auditFeynmanRubricExportDiscoverability,
  feynmanDraftWordCount,
  feynmanDiscoverabilityGuideHasExport,
  feynmanRubricOverallScore,
  FEYNMAN_RUBRIC_MIN_WORDS,
} from './feynmanRubricExportDiscoverabilityQA';

const sampleScores = {
  accuracy: 72,
  completeness: 65,
  simplicity: 80,
  structure: 70,
} as const;

describe('feynmanRubricExportDiscoverabilityQA', () => {
  it('counts draft words consistently', () => {
    expect(feynmanDraftWordCount('one two three')).toBe(3);
    expect(FEYNMAN_RUBRIC_MIN_WORDS).toBe(8);
  });

  it('averages rubric dimensions', () => {
    expect(feynmanRubricOverallScore(sampleScores)).toBe(72);
  });

  it('documents rubric export in discoverability guide', () => {
    expect(feynmanDiscoverabilityGuideHasExport()).toBe(true);
  });

  it('banners progress toward rubric export unlock', () => {
    const report = auditFeynmanRubricExportDiscoverability({
      draft: 'short draft here',
      rubricReady: false,
      lang: 'en',
      hasCoachFeedback: false,
    });
    expect(report.rubricReady).toBe(false);
    expect(report.wordsUntilRubric).toBeGreaterThan(0);
    expect(report.bannerSummary).toContain('more word');
    expect(report.ok).toBe(true);
  });

  it('marks export ready when rubric is computed', () => {
    const draft = 'This is a long enough explanation about supply and demand for rubric scoring.';
    const report = auditFeynmanRubricExportDiscoverability({
      draft,
      rubricReady: true,
      scores: sampleScores,
      lang: 'en',
      hasCoachFeedback: true,
    });
    expect(report.exportReady).toBe(true);
    expect(report.overallScore).toBe(72);
    expect(report.bannerSummary).toContain('Export HTML');
    expect(report.bannerSummary).toContain('Coach included');
    expect(report.ok).toBe(true);
  });
});
