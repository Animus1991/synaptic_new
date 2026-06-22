import { describe, expect, it } from 'vitest';
import { buildOcrOverlayRegions, needsOcrOverlay } from './readerOcrOverlay';

describe('readerOcrOverlay', () => {
  it('flags scanned PDFs with little extracted text', () => {
    expect(needsOcrOverlay('short', 'scan.pdf')).toBe(true);
    expect(needsOcrOverlay('x'.repeat(300), 'scan.pdf')).toBe(false);
  });

  it('builds paragraph block regions', () => {
    const text = 'Block one with enough characters here.\n\nBlock two also long enough for overlay.';
    const regions = buildOcrOverlayRegions(text);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0]?.width).toBeGreaterThan(0);
  });
});
