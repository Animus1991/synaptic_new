import { describe, expect, it } from 'vitest';
import { exportReaderAnnotationsMarkdown, segmentAnnotatedRange } from './readerAnnotationStore';

describe('readerAnnotationStore', () => {
  it('segments overlapping annotations', () => {
    const text = 'Hello world';
    const segs = segmentAnnotatedRange(text, [
      { id: '1', charStart: 0, charEnd: 5, color: '#fff', createdAt: '' },
    ], 0, text.length);
    expect(segs).toHaveLength(2);
    expect(text.slice(segs[0]!.start, segs[0]!.end)).toBe('Hello');
  });

  it('exports markdown', () => {
    const md = exportReaderAnnotationsMarkdown('abc def', [
      { id: '1', charStart: 0, charEnd: 3, color: '#fff', note: 'note', createdAt: '' },
    ]);
    expect(md).toContain('> abc');
    expect(md).toContain('note');
  });
});
