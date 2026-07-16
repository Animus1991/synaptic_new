/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { getRecommendedSessionType } from './recommendedSessionType';

describe('getRecommendedSessionType', () => {
  it('prefers cram when exam is within a week', () => {
    expect(getRecommendedSessionType({
      daysToExam: 3,
      reviewDueCount: 10,
      weakCount: 5,
      openTaskCount: 8,
    })).toBe('cram');
  });

  it('prefers review when many reviews are due', () => {
    expect(getRecommendedSessionType({
      daysToExam: 30,
      reviewDueCount: 5,
      weakCount: 0,
      openTaskCount: 4,
    })).toBe('review');
  });

  it('defaults to focused 25min', () => {
    expect(getRecommendedSessionType({
      daysToExam: null,
      reviewDueCount: 0,
      weakCount: 0,
      openTaskCount: 6,
    })).toBe('25min');
  });
});
