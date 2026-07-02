import { describe, expect, it } from 'vitest';
import { SPACED_ABSOLUTE_ADVANTAGE } from './greekOcrFixtures';
import { readerGreekOcrNeedsReview, repairStaleGreekReaderText } from './readerGreekDisplay';

describe('readerGreekDisplay (P1 — stale v2.2.0 Greek PDF)', () => {
  it('repairs spaced Greek OCR from legacy pipeline content at display time', () => {
    const repaired = repairStaleGreekReaderText(SPACED_ABSOLUTE_ADVANTAGE);
    expect(repaired).toContain('Απόλυτα πλεονεκτήματα');
    expect(repaired).not.toMatch(/α\sπ\sό\sλ\sυ\sτ\sα/i);
  });

  it('does not flag clean repaired Greek for OCR review', () => {
    const repaired = repairStaleGreekReaderText(SPACED_ABSOLUTE_ADVANTAGE);
    expect(readerGreekOcrNeedsReview(repaired)).toBe(false);
  });

  it('flags unrepaired spaced Greek for low-confidence review', () => {
    expect(readerGreekOcrNeedsReview(SPACED_ABSOLUTE_ADVANTAGE)).toBe(true);
  });
});
