import { describe, expect, it } from 'vitest';
import { computeThumbnailScale } from './pdfThumbnail';

describe('computeThumbnailScale', () => {
  it('fits the longest edge to maxEdgePx', () => {
    expect(computeThumbnailScale(612, 792, 144)).toBeCloseTo(144 / 792, 5);
  });

  it('never scales below 0.15', () => {
    expect(computeThumbnailScale(4000, 5000, 144)).toBeGreaterThanOrEqual(0.15);
  });

  it('handles tiny viewports', () => {
    expect(computeThumbnailScale(10, 20, 144)).toBe(7.2);
  });
});
