/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { isPostExamPhase } from './postExamNextSteps';

describe('isPostExamPhase (OPT-K65)', () => {
  it('returns false when examDate is missing', () => {
    expect(isPostExamPhase(undefined)).toBe(false);
    expect(isPostExamPhase('')).toBe(false);
  });

  it('returns false before exam day', () => {
    const now = Date.parse('2026-07-01T12:00:00.000Z');
    expect(isPostExamPhase('2026-07-10', now)).toBe(false);
  });

  it('returns true after exam day', () => {
    const now = Date.parse('2026-07-11T12:00:00.000Z');
    expect(isPostExamPhase('2026-07-10', now)).toBe(true);
  });
});
