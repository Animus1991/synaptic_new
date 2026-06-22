import { describe, expect, it } from 'vitest';
import { compareRowsToCsv } from './compareExport';

describe('compareRowsToCsv', () => {
  it('escapes commas and quotes', () => {
    const csv = compareRowsToCsv(
      ['Dimension', 'A', 'B'],
      [['Elastic, demand', 'High "change"', 'Low']],
    );
    expect(csv).toContain('"Elastic, demand"');
    expect(csv).toContain('"High ""change"""');
  });
});
