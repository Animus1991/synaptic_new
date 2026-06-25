import { describe, expect, it } from 'vitest';
import { sortCompareRows } from './compareSort';

describe('sortCompareRows', () => {
  const rows = [
    ['Elastic', 'High change', 'Low change'],
    ['Inelastic', 'Low change', 'High change'],
    ['Unit elastic', '1', '1'],
  ];

  it('sorts dimension column alphabetically ascending', () => {
    const sorted = sortCompareRows(rows, 0, 'asc');
    expect(sorted.map((r) => r[0])).toEqual(['Elastic', 'Inelastic', 'Unit elastic']);
  });

  it('prioritizes focus term on dimension column', () => {
    const sorted = sortCompareRows(rows, 0, 'asc', 'inelastic');
    expect(sorted[0]![0]).toBe('Inelastic');
  });
});
