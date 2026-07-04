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

export type OcrOverlayGranularity = 'word' | 'block';

export const LOW_CONFIDENCE_THRESHOLD = 0.65;

const MAX_HEURISTIC_WORDS = 120;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split a multi-word stored box into proportional per-word regions. */
export function splitStoredRegionIntoWords(region: OcrStoredRegion): OcrStoredRegion[] {
  const parts = region.text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [region];

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0) || 1;
  let cursor = region.left;
  return parts.map((word) => {
    const frac = word.length / totalChars;
    const width = region.width * frac;
    const box: OcrStoredRegion = {
      text: word,
      left: cursor,
      top: region.top,
      width,
      height: region.height,
      confidence: region.confidence,
      pageIndex: region.pageIndex,
    };
    cursor += width;
    return box;
  });
}

/** Normalize stored server boxes to one region per word when needed. */
export function normalizeStoredWordRegions(stored: OcrStoredRegion[]): OcrStoredRegion[] {
  return stored.flatMap((region) => {
    if (!region.text.includes(' ')) return [region];
    return splitStoredRegionIntoWords(region);
  });
}

export function storedRegionsToOverlay(stored: OcrStoredRegion[]): OcrOverlayRegion[] {
  return stored.map((r, i) => ({
    id: `ocr-srv-w-${r.pageIndex}-${i}`,
    text: r.text.slice(0, 200),
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    confidence: r.confidence,
  }));
}

function buildWordLevelHeuristicRegions(text: string, pageIndex: number): OcrOverlayRegion[] {
  const lines = text.split(/\n|\f/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const entries: { word: string; lineIdx: number; wordIdx: number; lineWordCount: number }[] = [];
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const words = lines[lineIdx]!.split(/\s+/).filter((word) => word.length > 0);
    for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
      entries.push({
        word: words[wordIdx]!,
        lineIdx,
        wordIdx,
        lineWordCount: words.length,
      });
    }
  }

  const capped = entries.slice(0, MAX_HEURISTIC_WORDS);
  const lineCount = Math.max(lines.length, 1);
  const rowH = Math.min(4.5, 85 / lineCount);

  return capped.map((entry, i) => {
    const wordWidth = Math.min(92 / Math.max(entry.lineWordCount, 1), 18);
    const left = 3 + entry.wordIdx * wordWidth;
    const top = 5 + entry.lineIdx * (rowH + 0.5);
    return {
      id: `ocr-w-${pageIndex}-${i}`,
      text: entry.word.slice(0, 80),
      left,
      top,
      width: Math.max(wordWidth - 0.3, 1.5),
      height: rowH,
      confidence: entry.word.length > 3 ? 0.72 : 0.58,
    };
  });
}

/**
 * Build overlay regions from stored server boxes when available, else heuristic
 * per-word blocks from OCR/plain text.
 */
export function buildOcrOverlayRegions(
  text: string,
  pageIndex = 0,
  stored?: OcrStoredRegion[],
): OcrOverlayRegion[] {
  if (stored && stored.length > 0) {
    const pageRegions = stored.filter((r) => r.pageIndex === pageIndex);
    const source = pageRegions.length > 0 ? pageRegions : pageIndex === 0 ? stored : [];
    if (source.length > 0) {
      return storedRegionsToOverlay(normalizeStoredWordRegions(source));
    }
  }

  return buildWordLevelHeuristicRegions(text, pageIndex);
}

export function ocrOverlayGranularity(
  text: string,
  stored?: OcrStoredRegion[],
): OcrOverlayGranularity {
  if (stored && stored.length > 0) return 'word';
  const regions = buildWordLevelHeuristicRegions(text, 0);
  return regions.length > 0 ? 'word' : 'block';
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

/** Count overlay word boxes for diagnostics/tests. */
export function countOcrWordRegions(
  text: string,
  pageIndex = 0,
  stored?: OcrStoredRegion[],
): number {
  return buildOcrOverlayRegions(text, pageIndex, stored).length;
}

/** Whether stored regions look like single-word server boxes. */
export function storedRegionsAreWordLevel(stored: OcrStoredRegion[]): boolean {
  if (stored.length === 0) return false;
  const singleWord = stored.filter((r) => !/\s/.test(r.text.trim())).length;
  return singleWord / stored.length >= 0.6;
}

export function findOverlayRegionByText(
  regions: OcrOverlayRegion[],
  needle: string,
): OcrOverlayRegion | undefined {
  const pattern = new RegExp(escapeRegExp(needle), 'i');
  return regions.find((region) => pattern.test(region.text));
}
