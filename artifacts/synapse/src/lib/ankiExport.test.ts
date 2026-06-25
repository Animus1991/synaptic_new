import { describe, expect, it } from 'vitest';
import { exportAnkiTsv } from './ankiExport';

describe('ankiExport', () => {
  it('produces Anki headers and tab-separated rows', () => {
    const tsv = exportAnkiTsv([{ front: 'Q', back: 'A' }], 'Synapse', ['econ']);
    expect(tsv).toContain('#deck:Synapse');
    expect(tsv).toContain('Q\tA');
    expect(tsv).toContain('#tags:econ');
  });
});
