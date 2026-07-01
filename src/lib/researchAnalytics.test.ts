import { describe, expect, it } from 'vitest';
import { computeResearchMetrics, buildResearchExport } from './researchAnalytics';
import { createEmptyLearnerModel } from './emptyLearnerState';
import type { ActivityItem } from '../types';
import type { LearningEvent } from './learningEvents';

describe('computeResearchMetrics', () => {
  it('builds BKT-lite rows from quiz activities', () => {
    const activities: ActivityItem[] = [
      { id: '1', type: 'quiz_passed', description: 'Passed quiz on tariffs', timestamp: new Date().toISOString() },
      { id: '2', type: 'quiz_failed', description: 'Missed quiz on tariffs', timestamp: new Date().toISOString() },
    ];
    const model = createEmptyLearnerModel();
    const metrics = computeResearchMetrics(model, activities, []);
    expect(metrics.bktConcepts.length).toBe(1);
    expect(metrics.bktConcepts[0]?.concept).toBe('tariffs');
    expect(metrics.bktConcepts[0]?.attempts).toBe(2);
  });

  it('computes Brier score from calibration points', () => {
    const model = createEmptyLearnerModel();
    model.confidenceCalibration = [
      { concept: 'A', predicted: 0.9, actual: 0.5, timestamp: new Date().toISOString() },
    ];
    const metrics = computeResearchMetrics(model, [], []);
    expect(metrics.brierScore).toBeCloseTo(0.16, 2);
  });
});

describe('buildResearchExport', () => {
  it('includes manifest versions and learner snapshot', () => {
    const model = createEmptyLearnerModel();
    const manifest = buildResearchExport(model, [], [], []);
    expect(manifest.fsrsVersion).toBe('FSRS-4');
    expect(manifest.pipelineVersion).toBeTruthy();
    expect(manifest.exportedAt).toBeTruthy();
    expect(manifest.metrics).toBeDefined();
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
