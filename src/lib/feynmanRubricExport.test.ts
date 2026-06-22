import { describe, expect, it } from 'vitest';
import { buildFeynmanRubricHtml } from './feynmanRubricExport';

describe('buildFeynmanRubricHtml', () => {
  it('includes concept and rubric scores', () => {
    const html = buildFeynmanRubricHtml({
      concept: 'Elasticity',
      explanation: 'Price elasticity measures responsiveness.',
      scores: { accuracy: 70, completeness: 60, simplicity: 80, structure: 55 },
      weak: ['structure'],
    });
    expect(html).toContain('Elasticity');
    expect(html).toContain('70%');
    expect(html).toContain('Structure');
  });
});
