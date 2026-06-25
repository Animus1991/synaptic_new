import { describe, expect, it } from 'vitest';
import { annotateDiffCells, cellSimilarity, findFocusBaselineRow, isDiffHighlight } from './compareDiff';

describe('compareDiff', () => {
  it('detects cell differences', () => {
    expect(cellSimilarity('elastic demand', 'inelastic demand')).toBeLessThan(1);
    expect(isDiffHighlight(cellSimilarity('high', 'low'))).toBe(true);
  });

  it('finds focus baseline row', () => {
    const items = [['Elastic', 'High', 'Large'], ['Inelastic', 'Low', 'Small']];
    expect(findFocusBaselineRow(items, 'elastic')).toBe(0);
  });

  it('annotates CSV rows with diff markers', () => {
    const rows = annotateDiffCells([
      ['Elastic', 'high response', 'large shift'],
      ['Inelastic', 'low response', 'large shift'],
    ], 0);
    expect(rows[1]?.[1]).toContain('[≠]');
  });
});
