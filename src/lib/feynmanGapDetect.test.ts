import { describe, expect, it } from 'vitest';
import { detectFeynmanGaps } from './feynmanGapDetect';

describe('feynmanGapDetect', () => {
  it('returns empty for very short drafts', () => {
    expect(detectFeynmanGaps('too short', 'elasticity', 'notes', [])).toEqual([]);
  });

  it('detects rubric gaps for thin explanations', () => {
    const reference = `
Price elasticity of demand measures how quantity demanded responds to price changes.
Elastic goods see large quantity shifts; inelastic goods see smaller shifts.
Equilibrium is where supply meets demand.
    `.trim();
    const draft = 'Elasticity is about price. Things change sometimes when price moves.';
    const gaps = detectFeynmanGaps(
      draft,
      'elasticity',
      reference,
      ['inelastic', 'equilibrium'],
      [{ term: 'elasticity', definition: 'responsiveness to price' }],
    );
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]?.searchTerm).toBeTruthy();
  });
});
