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

/**
 * Heuristic regions from OCR/plain text blocks (paragraph splits).
 * Full layout OCR deferred to server `/v1/ocr/pages` bounding boxes.
 */
export function buildOcrOverlayRegions(
  text: string,
  pageIndex = 0,
): OcrOverlayRegion[] {
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
    confidence: block.length > 40 ? 0.85 : 0.65,
  }));
}

export function needsOcrOverlay(text: string, fileName?: string): boolean {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    return text.length < 200;
  }
  return false;
}
