import { describe, expect, it } from 'vitest';
import { buildGlossaryCompanionParagraph, splitReaderParagraphs } from './readerTranslation';

describe('readerTranslation', () => {
  it('splits paragraphs on blank lines', () => {
    expect(splitReaderParagraphs('A\n\nB\n\nC')).toEqual(['A', 'B', 'C']);
  });

  it('inlines glossary definitions for matched terms', () => {
    const { companion, glossHits } = buildGlossaryCompanionParagraph(
      'Elastic demand responds strongly to price changes.',
      [{ term: 'Elastic demand', definition: 'Quantity changes strongly when price changes.', source: 't', relatedConcepts: [], courseId: 'c1' }],
    );
    expect(glossHits).toContain('Elastic demand');
    expect(companion).toContain('Quantity changes strongly');
  });
});
