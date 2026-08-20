import { describe, expect, it } from 'vitest';
import {
  retentionPredictionPercent,
  retentionPredictionProbability,
  updateRetentionPredictionPercent,
} from './retentionUnits';

describe('retention prediction unit boundary', () => {
  it('normalizes legacy probabilities and percentages to the same percent', () => {
    expect(retentionPredictionPercent(0.88)).toBe(88);
    expect(retentionPredictionPercent(88)).toBe(88);
    expect(retentionPredictionProbability(0.88)).toBe(0.88);
    expect(retentionPredictionProbability(88)).toBe(0.88);
  });

  it('applies percentage-point updates after normalization', () => {
    expect(updateRetentionPredictionPercent(0.88, 4)).toBe(92);
    expect(updateRetentionPredictionPercent(88, 4)).toBe(92);
    expect(updateRetentionPredictionPercent(0.1, -20)).toBe(0);
  });

  it('clamps invalid and out-of-range values', () => {
    expect(retentionPredictionPercent(Number.NaN)).toBe(0);
    expect(retentionPredictionPercent(-2)).toBe(0);
    expect(retentionPredictionPercent(140)).toBe(100);
  });
});
