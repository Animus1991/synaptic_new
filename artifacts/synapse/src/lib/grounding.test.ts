import { describe, it, expect } from 'vitest';
import { verifyGrounding, verifyAnswer } from './grounding';

describe('grounding verification', () => {
  const source = `
The speed of light in a vacuum is 299,792,458 m/s.
Newton formulated the laws of motion.
The Earth orbits the Sun at an average distance of 149.6 million km.
  `.trim();

  it('grounds numeric claims', () => {
    const result = verifyGrounding(['The speed of light is 299,792,458 m/s.'], source, { strict: true });
    expect(result.checks[0]!.grounded).toBe(true);
    expect(result.strictPass).toBe(true);
  });

  it('grounds entity claims', () => {
    const result = verifyGrounding(['Newton created the laws of motion.'], source);
    expect(result.checks[0]!.grounded).toBe(true);
  });

  it('flags ungrounded claims', () => {
    const result = verifyGrounding(['Einstein invented the telescope.'], source, { strict: true });
    expect(result.checks[0]!.grounded).toBe(false);
    expect(result.strictPass).toBe(false);
  });

  it('verifies a full answer', () => {
    const answer = 'The speed of light is 299,792,458 m/s. Newton formulated the laws of motion.';
    const result = verifyAnswer(answer, source);
    expect(result.faithfulness).toBeGreaterThan(0.8);
    expect(result.groundedRatio).toBeGreaterThan(0.5);
  });

  it('matches numbers with different formatting', () => {
    const result = verifyGrounding(['The average distance is 149.6 million km.'], source);
    expect(result.checks[0]!.grounded).toBe(true);
  });
});
