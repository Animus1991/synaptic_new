import { describe, expect, it } from 'vitest';
import {
  hasStoredLineSpan,
  resolveSpanOffsetsInLine,
  segmentStoredLineSpans,
  spanExcerptFromLine,
} from './annotationSpan';

describe('annotationSpan', () => {
  it('detects stored line spans', () => {
    expect(hasStoredLineSpan({ charStart: 2, charEnd: 8 })).toBe(true);
    expect(hasStoredLineSpan({ charStart: 2, charEnd: 2 })).toBe(false);
  });

  it('segments overlapping highlight spans', () => {
    const line = 'Supply and demand determine equilibrium.';
    const segments = segmentStoredLineSpans(line.length, [
      { id: 'a', color: '#818cf8', charStart: 0, charEnd: 6 },
      { id: 'b', color: '#fbbf24', charStart: 11, charEnd: 17 },
    ]);
    expect(segments).toHaveLength(4);
    expect(segments[0]).toMatchObject({ start: 0, end: 6, color: '#818cf8' });
    expect(segments[3]).toMatchObject({ start: 17, end: line.length });
  });

  it('resolves span offsets from excerpt', () => {
    const line = 'Price elasticity measures responsiveness.';
    const offsets = resolveSpanOffsetsInLine(line, 'elasticity measures');
    expect(offsets).toEqual({ charStart: 6, charEnd: 25 });
  });

  it('builds span excerpt for anchors', () => {
    const line = 'Newton second law: F equals m a.';
    expect(spanExcerptFromLine(line, 19, 32)).toBe('F equals m a.');
    expect(spanExcerptFromLine(line)).toBe(line);
  });
});
