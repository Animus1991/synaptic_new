/** OCR text regions for Reader overlay on scanned uploads. */
export type OcrOverlayRegion = {
  id: string;
  text: string;
  /** 0–100 percentage of container */
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
};

/** Persisted server OCR word boxes (percent of page dimensions). */
export type OcrStoredRegion = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
  pageIndex: number;
};

export const LOW_CONFIDENCE_THRESHOLD = 0.65;

export function storedRegionsToOverlay(stored: OcrStoredRegion[]): OcrOverlayRegion[] {
  return stored.map((r, i) => ({
    id: `ocr-srv-${r.pageIndex}-${i}`,
    text: r.text.slice(0, 200),
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    confidence: r.confidence,
  }));
}

/**
 * Build overlay regions from stored server boxes when available, else heuristic
 * paragraph blocks from OCR/plain text.
 */
export function buildOcrOverlayRegions(
  text: string,
  pageIndex = 0,
  stored?: OcrStoredRegion[],
): OcrOverlayRegion[] {
  if (stored && stored.length > 0) {
    const pageRegions = stored.filter((r) => r.pageIndex === pageIndex);
    if (pageRegions.length > 0) return storedRegionsToOverlay(pageRegions);
    if (pageIndex === 0) return storedRegionsToOverlay(stored);
  }

  const blocks = text.split(/\n{2,}|\f/).map((b) => b.trim()).filter((b) => b.length > 8);
  if (blocks.length === 0) return [];

  const rowH = Math.min(18, 80 / Math.max(blocks.length, 1));
  return blocks.slice(0, 12).map((block, i) => ({
    id: `ocr-${pageIndex}-${i}`,
    text: block.slice(0, 200),
    left: 4 + (i % 2) * 2,
    top: 6 + i * rowH,
    width: 92,
    height: rowH - 1,
    confidence: block.length > 40 ? 0.85 : 0.55,
  }));
}

export function needsOcrOverlay(text: string, fileName?: string): boolean {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    return text.length < 200;
  }
  return false;
}

export function isLowConfidenceRegion(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}
