import { describe, expect, it } from 'vitest';
import {
  extractStudySignalsHeuristic,
  looksLikeStudyRoutineUtterance,
} from './extractStudySignals';

const ctx = {
  lang: 'el' as const,
  courses: [
    { id: 'c1', title: 'Μικροοικονομία' },
    { id: 'c2', title: 'Python' },
  ],
};

describe('extractStudySignalsHeuristic', () => {
  it('fills ≥3 fields from one casual Greek utterance', () => {
    const r = extractStudySignalsHeuristic(
      'κουρασμένος, 20 λεπτά, επανάληψη μικροοικονομία',
      ctx,
    );
    expect(r.patch.energy).toBe('low');
    expect(r.patch.availableMinutes).toBe(20);
    expect(r.patch.sessionIntent).toBe('review');
    expect(r.patch.focusCourseId).toBe('c1');
    expect(r.filledSlots.length).toBeGreaterThanOrEqual(3);
  });

  it('fills English multi-signal line', () => {
    const r = extractStudySignalsHeuristic(
      "I'm tired, about 25 min, just a light touch on Python",
      { ...ctx, lang: 'en' },
    );
    expect(r.patch.energy).toBe('low');
    expect(r.patch.availableMinutes).toBe(25);
    expect(r.patch.sessionIntent).toBe('light');
    expect(r.patch.focusCourseId).toBe('c2');
  });

  it('does not treat pure academic questions as routine', () => {
    expect(looksLikeStudyRoutineUtterance('What is price elasticity of demand?')).toBe(false);
    expect(looksLikeStudyRoutineUtterance('κουρασμένος, 20 λεπτά επανάληψη')).toBe(true);
  });
});
