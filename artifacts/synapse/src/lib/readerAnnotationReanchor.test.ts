import { describe, expect, it } from 'vitest';
import {
  excerptFromReaderSpan,
  refreshReaderAnnotationsAfterReprocess,
  resolveReaderSpanOffsets,
} from './readerAnnotationReanchor';

describe('readerAnnotationReanchor', () => {
  it('extracts excerpt from span', () => {
    expect(excerptFromReaderSpan('hello beautiful world', 6, 15)).toBe('beautiful');
  });

  it('resolves exact excerpt in new text', () => {
    const text = 'alpha beta gamma delta';
    expect(resolveReaderSpanOffsets(text, 'beta gamma')).toEqual({ charStart: 6, charEnd: 16 });
  });

  it('reanchors when text shifts', () => {
    const items = [{
      id: 'a1',
      charStart: 7,
      charEnd: 42,
      color: '#ff0',
      createdAt: '2026-01-01T00:00:00.000Z',
      excerpt: 'The mitochondria is the powerhouse.',
    }];
    const newText = 'Preface added.\n\nThe mitochondria is the powerhouse.\nEnd.';
    const refreshed = refreshReaderAnnotationsAfterReprocess(items, newText);
    expect(refreshed[0]!.anchorStatus).toBe('ok');
    expect(newText.slice(refreshed[0]!.charStart, refreshed[0]!.charEnd)).toContain('mitochondria');
  });

  it('flags needs-review when excerpt disappears', () => {
    const refreshed = refreshReaderAnnotationsAfterReprocess(
      [{
        id: 'a1',
        charStart: 0,
        charEnd: 10,
        color: '#ff0',
        createdAt: '2026-01-01T00:00:00.000Z',
        excerpt: 'completely removed phrase xyz',
      }],
      'totally different document content here',
    );
    expect(refreshed[0]!.anchorStatus).toBe('needs-review');
  });

  it('flags legacy when no excerpt is stored', () => {
    const refreshed = refreshReaderAnnotationsAfterReprocess(
      [{
        id: 'a1',
        charStart: 0,
        charEnd: 5,
        color: '#ff0',
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      'totally different document content here',
    );
    expect(refreshed[0]!.anchorStatus).toBe('legacy');
  });
});
