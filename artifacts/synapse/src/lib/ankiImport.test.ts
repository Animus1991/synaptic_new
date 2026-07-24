import { describe, it, expect } from 'vitest';
import { parseAnkiTsv } from './ankiImport';

describe('parseAnkiTsv', () => {
  it('parses header directives and tab-separated cards', () => {
    const tsv = `#separator:tab
#deck:Physics
#tags:synapse import
What is F=ma?\tNewton's second law
`;
    const cards = parseAnkiTsv(tsv);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.front).toBe('What is F=ma?');
    expect(cards[0]!.back).toBe("Newton's second law");
    expect(cards[0]!.deck).toBe('Physics');
    expect(cards[0]!.tags).toEqual(['synapse', 'import']);
  });

  it('converts <br> to newlines', () => {
    const cards = parseAnkiTsv('Line1<br>Line2\tAnswer');
    expect(cards[0]!.front).toBe('Line1\nLine2');
  });
});
