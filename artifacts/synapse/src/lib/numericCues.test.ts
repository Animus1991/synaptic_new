import { describe, expect, it } from 'vitest';
import { extractNumericCues } from './numericCues';

describe('extractNumericCues', () => {
  it('pulls percentages from relevant sentences', () => {
    const cues = extractNumericCues(
      'Price elasticity is 50% when demand shifts. Unrelated topic 99%.',
      'elasticity',
      3,
    );
    expect(cues.length).toBeGreaterThan(0);
    expect(cues[0]!.baseline).toBe(50);
  });
});
