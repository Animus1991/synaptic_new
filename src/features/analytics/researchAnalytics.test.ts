import { describe, expect, it } from 'vitest';
import {
  RESEARCH_EXPORT_SCHEMA_VERSION,
  buildResearchExport,
  computeResearchMetrics,
} from './researchAnalytics';
import { createEmptyLearnerModel } from '../../lib/emptyLearnerState';
import type { ActivityItem } from '../../types';
import type { LearningEvent } from '../../lib/learningEvents';

describe('computeResearchMetrics', () => {
  it('builds observed concept-accuracy rows from quiz activities', () => {
    const activities: ActivityItem[] = [
      { id: '1', type: 'quiz_passed', description: 'Passed quiz on tariffs', timestamp: new Date().toISOString() },
      { id: '2', type: 'quiz_failed', description: 'Missed quiz on tariffs', timestamp: new Date().toISOString() },
    ];
    const model = createEmptyLearnerModel();
    const metrics = computeResearchMetrics(model, activities, []);
    expect(metrics.bktConcepts.length).toBe(1);
    expect(metrics.bktConcepts[0]?.concept).toBe('tariffs');
    expect(metrics.bktConcepts[0]?.attempts).toBe(2);
    expect(metrics.bktConcepts[0]?.observedAccuracy).toBe(0.5);
  });

  it('computes Brier score from calibration points', () => {
    const model = createEmptyLearnerModel();
    model.confidenceCalibration = [
      { concept: 'A', predicted: 0.9, actual: 0.5, timestamp: new Date().toISOString() },
    ];
    const metrics = computeResearchMetrics(model, [], []);
    expect(metrics.brierScore).toBeCloseTo(0.16, 2);
    expect(metrics.calibrationSampleSize).toBe(1);
  });

  it('computes sample-weighted binned ECE instead of pointwise absolute error', () => {
    const model = createEmptyLearnerModel();
    model.confidenceCalibration = [
      { concept: 'A', predicted: 0.61, actual: 1, timestamp: '2026-08-01T10:00:00.000Z' },
      { concept: 'B', predicted: 0.69, actual: 0, timestamp: '2026-08-01T11:00:00.000Z' },
    ];

    const metrics = computeResearchMetrics(model, [], []);

    expect(metrics.expectedCalibrationError).toBeCloseTo(0.15, 8);
    expect(metrics.calibrationBinCount).toBe(1);
    expect(metrics.calibrationSampleSize).toBe(2);
  });

  it('rejects non-finite and out-of-range calibration inputs', () => {
    const model = createEmptyLearnerModel();
    model.confidenceCalibration = [
      { concept: 'valid', predicted: 0.5, actual: 1, timestamp: '2026-08-01T10:00:00.000Z' },
      { concept: 'too-high', predicted: 1.2, actual: 1, timestamp: '2026-08-01T10:00:00.000Z' },
      { concept: 'invalid', predicted: Number.NaN, actual: 0, timestamp: '2026-08-01T10:00:00.000Z' },
    ];

    const metrics = computeResearchMetrics(model, [], []);

    expect(metrics.calibrationSampleSize).toBe(1);
    expect(metrics.brierScore).toBe(0.25);
    expect(metrics.expectedCalibrationError).toBe(0.5);
  });

  it('reports unavailable scheduling metrics without eligible intervals', () => {
    const emptyMetrics = computeResearchMetrics(createEmptyLearnerModel(), [], []);
    expect(emptyMetrics.spacingDensity).toBeNull();
    expect(emptyMetrics.meanSpacingIntervalDays).toBeNull();
    expect(emptyMetrics.spacingSampleSize).toBe(0);
    expect(emptyMetrics.interleavingRatio).toBeNull();
    expect(emptyMetrics.interleavingTransitions).toBe(0);
  });

  it('reports adjacent concept transitions from structured events', () => {
    const events: LearningEvent[] = ['A', 'B', 'B'].map((concept, index) => ({
      id: `event-${index}`,
      type: 'quiz_attempted',
      timestamp: `2026-08-01T1${index}:00:00.000Z`,
      concept,
      payload: { correct: true },
    }));

    const metrics = computeResearchMetrics(createEmptyLearnerModel(), [], events);

    expect(metrics.interleavingRatio).toBe(0.5);
    expect(metrics.interleavingConceptEvents).toBe(3);
    expect(metrics.interleavingTransitions).toBe(2);
  });

  it('excludes quiz events with no explicit correctness outcome', () => {
    const events: LearningEvent[] = [{
      id: 'event-unknown',
      type: 'quiz_attempted',
      timestamp: '2026-08-01T10:00:00.000Z',
      concept: 'elasticity',
      payload: {},
    }];

    const metrics = computeResearchMetrics(createEmptyLearnerModel(), [], events);

    expect(metrics.bktConcepts).toEqual([]);
  });
});

describe('buildResearchExport', () => {
  it('includes manifest versions and learner snapshot', () => {
    const model = createEmptyLearnerModel();
    const now = new Date('2026-08-20T12:00:00.000Z');
    const manifest = buildResearchExport(model, [], [], [], { range: '7d', now });
    expect(manifest.schemaVersion).toBe(RESEARCH_EXPORT_SCHEMA_VERSION);
    expect(manifest.fsrsVersion).toBe('FSRS-6');
    expect(manifest.fsrsConfiguration).toMatchObject({
      requestRetention: 0.9,
      enableShortTerm: true,
      enableFuzz: false,
      learningSteps: ['1m', '10m'],
    });
    expect(manifest.pipelineVersion).toBe('2.5.1');
    expect(manifest.exportedAt).toBe(now.toISOString());
    expect(manifest.scope).toEqual({
      dateRange: '7d',
      startAt: '2026-08-13T12:00:00.000Z',
      endAt: now.toISOString(),
      schedulingMetrics: 'current-model-snapshot',
    });
    expect(manifest.metrics).toBeDefined();
    expect(manifest.metricInputs.confidenceCalibration).toEqual([]);
    expect(manifest.metricInputs.spacingIntervals).toEqual([]);
  });

  it('prefers quiz_attempted events for BKT when present', () => {
    const events: LearningEvent[] = [
      {
        id: 'e1',
        type: 'quiz_attempted',
        timestamp: new Date().toISOString(),
        concept: 'elasticity',
        payload: { correct: true },
      },
    ];
    const manifest = buildResearchExport(createEmptyLearnerModel(), [], events, []);
    expect(manifest.metrics.bktConcepts[0]?.concept).toBe('elasticity');
  });
});
