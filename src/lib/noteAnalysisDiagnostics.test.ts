import { describe, expect, it } from 'vitest';
import {
  buildTruthfulQaMetrics,
  computeMaterialProcessingReadiness,
  formatDiagnosticCount,
  resolveDiagnosticCount,
} from './noteAnalysisDiagnostics';
import type { Course } from '../types';
import { mockCourses } from '../demo/mockData';

const baseCourse = (overrides: Partial<Course> = {}): Course => ({
  ...mockCourses[0],
  ...overrides,
});

describe('noteAnalysisDiagnostics', () => {
  it('resolveDiagnosticCount distinguishes unknown vs zero', () => {
    expect(resolveDiagnosticCount(undefined, false).kind).toBe('unknown');
    expect(resolveDiagnosticCount(undefined, true).kind).toBe('zero');
    expect(resolveDiagnosticCount(0, true).kind).toBe('zero');
    expect(resolveDiagnosticCount(4, true)).toEqual({ kind: 'known', value: 4 });
  });

  it('formatDiagnosticCount renders unknown label', () => {
    expect(formatDiagnosticCount({ kind: 'unknown' }, 'en')).toBe('Unknown');
    expect(formatDiagnosticCount({ kind: 'zero' }, 'en')).toBe('0');
  });

  it('computeMaterialProcessingReadiness returns insufficient without source quality', () => {
    const r = computeMaterialProcessingReadiness(baseCourse(), 500, true, 'en');
    expect(r.score).toBeNull();
    expect(r.status).toBe('insufficient');
  });

  it('computeMaterialProcessingReadiness uses pipeline score when present', () => {
    const r = computeMaterialProcessingReadiness(
      baseCourse({ sourceQuality: { score: 72, band: 'strong', needsMoreMaterial: false, warnings: [], strengths: [], nextActions: [], recommendedTopicCount: 4, detectedTopicCount: 4, finalTopicCount: 4, outlineAdjusted: false, metrics: { wordCount: 500, sectionCount: 2, definitionCount: 1, glossaryCount: 0, keyphraseCount: 3, workedExampleCount: 0, formulaCount: 0, comparisonCount: 0, averageConceptsPerTopic: 1 } } }),
      500,
      true,
      'en',
    );
    expect(r.score).toBe(72);
    expect(r.status).toBe('ready');
  });

  it('buildTruthfulQaMetrics omits fabricated defaults', () => {
    expect(buildTruthfulQaMetrics(baseCourse(), 0, 'en')).toEqual([]);
    const withSq = buildTruthfulQaMetrics(
      baseCourse({ sourceQuality: { score: 55, band: 'moderate', needsMoreMaterial: true, warnings: [], strengths: [], nextActions: [], recommendedTopicCount: 3, detectedTopicCount: 3, finalTopicCount: 3, outlineAdjusted: false, metrics: { wordCount: 100, sectionCount: 1, definitionCount: 0, glossaryCount: 0, keyphraseCount: 0, workedExampleCount: 0, formulaCount: 0, comparisonCount: 0, averageConceptsPerTopic: 1 } } }),
      2,
      'en',
    );
    expect(withSq.some((m) => m.id === 'source-coverage')).toBe(true);
    expect(withSq.every((m) => m.available)).toBe(true);
  });
});
