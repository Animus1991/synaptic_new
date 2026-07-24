import { describe, expect, it } from 'vitest';
import { conceptMatchesStepTitle, relatedConceptChips } from './conceptLensRibbon';

describe('conceptLensRibbon', () => {
  it('matches Supply & Demand with Supply and Demand step title', () => {
    expect(conceptMatchesStepTitle('Supply & Demand', 'Supply and Demand')).toBe(true);
  });

  it('does not match unrelated step', () => {
    expect(conceptMatchesStepTitle('Supply & Demand', 'Knowledge Check')).toBe(false);
  });

  it('filters active concept from related chips', () => {
    const chips = relatedConceptChips(
      [{ label: 'Supply & Demand' }, { label: 'Elasticity' }],
      'Supply and Demand',
    );
    expect(chips.map((c) => c.label)).toEqual(['Elasticity']);
  });
});
