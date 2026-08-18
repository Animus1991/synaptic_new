import { describe, expect, it } from 'vitest';
import type { Misconception } from '../types';
import {
  applyQuizMisconception,
  misconceptionIdForConcept,
} from './misconceptionWriter';
import { selectUnresolvedMisconceptions } from './dashboardPageSelectors';
import { createEmptyLearnerModel } from './emptyLearnerState';

const base: Misconception = {
  id: 'misc:elasticity',
  concept: 'Elasticity',
  description: 'old',
  frequency: 1,
  corrected: false,
  relatedErrors: ['recall'],
  suggestedFix: 'old fix',
  detectedAt: '2026-01-01T00:00:00.000Z',
};

describe('misconceptionWriter', () => {
  it('creates a misconception from a first-attempt quiz miss', () => {
    const next = applyQuizMisconception([], {
      concept: 'Elasticity',
      confidence: 40,
      now: '2026-08-16T00:00:00.000Z',
    });
    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe(misconceptionIdForConcept('Elasticity'));
    expect(next[0]!.corrected).toBe(false);
    expect(next[0]!.frequency).toBe(1);
    expect(next[0]!.description).toMatch(/first-attempt quiz/i);
    expect(selectUnresolvedMisconceptions({
      ...createEmptyLearnerModel(),
      misconceptions: next,
    })).toHaveLength(1);
  });

  it('is a no-op on a correct answer', () => {
    expect(applyQuizMisconception([base], { concept: 'Elasticity', confidence: 80, correct: true })).toEqual([base]);
  });

  it('increments frequency on a repeat miss of the same concept', () => {
    const next = applyQuizMisconception([base], { concept: 'elasticity calculations', confidence: 80 });
    expect(next).toHaveLength(1);
    expect(next[0]!.frequency).toBe(2);
    expect(next[0]!.relatedErrors).toContain('conceptual');
    expect(next[0]!.corrected).toBe(false);
  });

  it('reopens a previously corrected misconception on a new miss', () => {
    const corrected = { ...base, corrected: true };
    const next = applyQuizMisconception([corrected], {
      concept: 'Elasticity',
      confidence: 50,
      now: '2026-08-16T12:00:00.000Z',
    });
    expect(next[0]!.corrected).toBe(false);
    expect(next[0]!.frequency).toBe(2);
    expect(next[0]!.detectedAt).toBe('2026-08-16T12:00:00.000Z');
  });

  it('uses exam copy for exam-source misses', () => {
    const next = applyQuizMisconception([], {
      concept: 'Nash equilibrium',
      confidence: 90,
      source: 'exam',
    });
    expect(next[0]!.description).toMatch(/exam-style/i);
    expect(next[0]!.relatedErrors).toContain('exam-application');
  });

  it('writes Greek copy when lang is el', () => {
    const next = applyQuizMisconception([], {
      concept: 'Ελαστικότητα',
      confidence: 30,
      lang: 'el',
    });
    expect(next[0]!.description).toMatch(/πρώτη προσπάθεια/i);
  });
});
