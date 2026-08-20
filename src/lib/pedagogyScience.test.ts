import { describe, expect, it } from 'vitest';
import { computeCalibration, computeExamReadiness, type BetaMastery } from './pedagogy';

describe('pedagogy scientific invariants', () => {
  it('returns zero readiness without first-attempt evidence', () => {
    expect(computeExamReadiness([], 0, 1, 0)).toBe(0);
    expect(computeExamReadiness([], 0.8, 0, 0)).toBe(0);
  });

  it('does not let help-seeking alone change early readiness', () => {
    const withHelp = computeExamReadiness([], 0.7, 0.1, 3);
    const withoutHelp = computeExamReadiness([], 0.7, 0.9, 3);
    expect(withHelp).toBe(70);
    expect(withoutHelp).toBe(withHelp);
  });

  it('keeps unattempted objectives in the readiness denominator', () => {
    const concepts: BetaMastery[] = [
      { concept: 'practised', alpha: 9, beta: 1, firstAttempts: 5, importance: 1 },
      { concept: 'unattempted', alpha: 1, beta: 1, firstAttempts: 0, importance: 1 },
    ];

    expect(computeExamReadiness(concepts, 1, 1, 5)).toBe(45);
  });

  it('does not allow opposite confidence errors to cancel into a perfect score', () => {
    const timestamp = '2026-08-20T12:00:00.000Z';
    const points = [
      { concept: 'A', predicted: 1, actual: 0, timestamp },
      { concept: 'B', predicted: 0, actual: 1, timestamp },
      { concept: 'C', predicted: 1, actual: 0, timestamp },
      { concept: 'D', predicted: 0, actual: 1, timestamp },
      { concept: 'E', predicted: 0.5, actual: 0.5, timestamp },
    ];

    const result = computeCalibration(points);
    expect(result?.direction).toBe('calibrated');
    expect(result?.score).toBe(20);
    expect(result?.score).toBeLessThan(100);
  });

  it('rejects invalid calibration records before applying the sample gate', () => {
    const timestamp = '2026-08-20T12:00:00.000Z';
    const points = Array.from({ length: 4 }, (_, index) => ({
      concept: `valid-${index}`,
      predicted: 0.5,
      actual: 1,
      timestamp,
    }));
    points.push({ concept: 'invalid', predicted: 1.5, actual: 1, timestamp });

    expect(computeCalibration(points)).toBeNull();
  });
});
