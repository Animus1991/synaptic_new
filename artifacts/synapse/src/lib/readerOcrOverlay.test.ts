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

  it('prefers stored server regions over heuristics', () => {
    const stored = [
      { text: 'ΔΙΑΛΕΞΗ', left: 10, top: 5, width: 20, height: 3, confidence: 0.42, pageIndex: 0 },
      { text: 'Οικονομική', left: 12, top: 8, width: 25, height: 3, confidence: 0.88, pageIndex: 0 },
    ];
    const regions = buildOcrOverlayRegions('short', 0, stored);
    expect(regions).toHaveLength(2);
    expect(regions[0]!.confidence).toBeLessThan(0.65);
    expect(regions[1]!.confidence).toBeGreaterThan(0.8);
  });
});
