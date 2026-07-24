import { describe, expect, it } from 'vitest';
import {
  buildOcrOverlayRegions,
  countOcrWordRegions,
  findOverlayRegionByText,
  needsOcrOverlay,
  normalizeStoredWordRegions,
  ocrOverlayGranularity,
  splitStoredRegionIntoWords,
  storedRegionsAreWordLevel,
} from './readerOcrOverlay';

describe('readerOcrOverlay', () => {
  it('flags scanned PDFs with little extracted text', () => {
    expect(needsOcrOverlay('short', 'scan.pdf')).toBe(true);
    expect(needsOcrOverlay('x'.repeat(300), 'scan.pdf')).toBe(false);
  });

  it('builds per-word heuristic regions from plain text', () => {
    const text = 'Block one with enough characters here.\n\nBlock two also long enough for overlay.';
    const regions = buildOcrOverlayRegions(text);
    expect(regions.length).toBeGreaterThan(2);
    expect(regions.every((r) => r.id.startsWith('ocr-w-'))).toBe(true);
    expect(regions.every((r) => !r.text.includes(' '))).toBe(true);
    expect(ocrOverlayGranularity(text)).toBe('word');
  });

  it('prefers stored server regions over heuristics', () => {
    const stored = [
      { text: 'ΔΙΑΛΕΞΗ', left: 10, top: 5, width: 20, height: 3, confidence: 0.42, pageIndex: 0 },
      { text: 'Οικονομική', left: 12, top: 8, width: 25, height: 3, confidence: 0.88, pageIndex: 0 },
    ];
    const regions = buildOcrOverlayRegions('short', 0, stored);
    expect(regions).toHaveLength(2);
    expect(regions[0]!.id).toMatch(/^ocr-srv-w-/);
    expect(regions[0]!.confidence).toBeLessThan(0.65);
    expect(regions[1]!.confidence).toBeGreaterThan(0.8);
    expect(storedRegionsAreWordLevel(stored)).toBe(true);
  });

  it('splits multi-word stored boxes into proportional word regions', () => {
    const stored = [
      { text: 'Διεθνής Οικονομική', left: 10, top: 5, width: 40, height: 3, confidence: 0.9, pageIndex: 0 },
    ];
    const words = normalizeStoredWordRegions(stored);
    expect(words).toHaveLength(2);
    expect(words[0]!.text).toBe('Διεθνής');
    expect(words[1]!.text).toBe('Οικονομική');
    expect(words[0]!.width + words[1]!.width).toBeCloseTo(40, 5);

    const split = splitStoredRegionIntoWords(stored[0]!);
    expect(split).toHaveLength(2);
    const regions = buildOcrOverlayRegions('ignored', 0, stored);
    expect(regions).toHaveLength(2);
  });

  it('finds overlay region by partial text match', () => {
    const text = 'International trade policy balance of payments.';
    const regions = buildOcrOverlayRegions(text);
    const hit = findOverlayRegionByText(regions, 'trade');
    expect(hit).toBeDefined();
    expect(hit!.text.toLowerCase()).toContain('trade');
    expect(countOcrWordRegions(text)).toBe(regions.length);
  });
});
