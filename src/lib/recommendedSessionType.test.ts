/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  getRecommendedSessionType,
  recommendSessionFromAppState,
} from './recommendedSessionType';

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

  it('prefers 10min when only a couple of open tasks', () => {
    expect(getRecommendedSessionType({
      daysToExam: null,
      reviewDueCount: 0,
      weakCount: 0,
      openTaskCount: 2,
    })).toBe('10min');
  });

  it('honors chat check-in energy/intent over raw task counts', () => {
    expect(getRecommendedSessionType({
      daysToExam: 30,
      reviewDueCount: 0,
      weakCount: 5,
      openTaskCount: 8,
      checkInEnergy: 'low',
    })).toBe('10min');
    expect(getRecommendedSessionType({
      daysToExam: 30,
      reviewDueCount: 0,
      weakCount: 0,
      openTaskCount: 8,
      checkInIntent: 'review',
    })).toBe('review');
  });
});

describe('recommendSessionFromAppState', () => {
  it('counts spaced reviews from tasks and matches getRecommendedSessionType', () => {
    const tasks = [
      { status: 'pending', category: 'review', isSpacedRepetition: true },
      { status: 'pending', category: 'review', isSpacedRepetition: true },
      { status: 'pending', category: 'review', isSpacedRepetition: true },
      { status: 'pending', category: 'learn', isSpacedRepetition: false },
      { status: 'completed', category: 'review', isSpacedRepetition: true },
    ];
    expect(recommendSessionFromAppState(tasks, {
      daysToExam: 30,
      spacingIntervalCount: 0,
      weakAreaCount: 0,
    })).toBe('review');
  });

  it('falls back to spacingIntervalCount when no review tasks', () => {
    expect(recommendSessionFromAppState(
      [{ status: 'pending', category: 'learn' }],
      { daysToExam: null, spacingIntervalCount: 5, weakAreaCount: 0 },
    )).toBe('review');
  });

  it('uses weakAreaCount for 25min when reviews are low', () => {
    expect(recommendSessionFromAppState(
      [
        { status: 'pending', category: 'learn' },
        { status: 'pending', category: 'learn' },
        { status: 'pending', category: 'learn' },
      ],
      { daysToExam: null, spacingIntervalCount: 0, weakAreaCount: 3 },
    )).toBe('25min');
  });
});
