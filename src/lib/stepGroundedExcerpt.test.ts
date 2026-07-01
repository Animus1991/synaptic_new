import { describe, expect, it } from 'vitest';
import { resolveWorkspaceStepExcerpt } from './stepGroundedExcerpt';

const MICRO = `Microeconomics Fundamentals — Lecture Notes

1. Supply and Demand
The law of demand states that quantity demanded falls as price rises. Market equilibrium occurs where supply meets demand.

2. Consumer Theory
Consumers maximize utility subject to a budget constraint.`;

describe('resolveWorkspaceStepExcerpt', () => {
  it('matches Supply & Demand step against Supply and Demand section', () => {
    const excerpt = resolveWorkspaceStepExcerpt(MICRO, 'Supply & Demand', 'Microeconomics');
    expect(excerpt.toLowerCase()).toContain('law of demand');
    expect(excerpt.toLowerCase()).not.toContain('budget constraint');
  });

  it('falls back to course concept when step title is missing', () => {
    const excerpt = resolveWorkspaceStepExcerpt(MICRO, undefined, 'Consumer Theory');
    expect(excerpt.toLowerCase()).toContain('utility');
  });

  it('returns empty for empty source', () => {
    expect(resolveWorkspaceStepExcerpt('', 'Supply & Demand', 'Micro')).toBe('');
  });
});
