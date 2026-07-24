/**
 * Sprint J — build image-occlusion Leitner cards from Reader text selection.
 */
import type { UploadedFile } from '../types';
import type { Lang } from './i18n';
import type { OcrStoredRegion } from './readerOcrOverlay';
import {
  buildOcrOverlayRegions,
  findOverlayRegionByText,
  normalizeStoredWordRegions,
} from './readerOcrOverlay';
import {
  buildOcclusionCardFromRegion,
  isOcclusionCandidate,
} from './imageOcclusionCards';
import type { LeitnerCard } from './leitnerSessionModel';

export type OcclusionSelectionMatch = {
  file: UploadedFile;
  region: OcrStoredRegion;
};

function regionMatchesSelection(region: OcrStoredRegion, selection: string): boolean {
  const sel = selection.trim();
  if (!sel) return false;
  const rt = region.text.trim();
  if (!rt) return false;
  const selLower = sel.toLowerCase();
  const rtLower = rt.toLowerCase();
  if (selLower === rtLower) return true;
  if (rtLower.includes(selLower) || selLower.includes(rtLower)) return true;
  const firstWord = sel.split(/\s+/).find((w) => w.length >= 2);
  if (firstWord && firstWord.toLowerCase() === rtLower) return true;
  return false;
}

function overlayToStored(region: {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
}, pageIndex: number): OcrStoredRegion {
  return {
    text: region.text,
    left: region.left,
    top: region.top,
    width: region.width,
    height: region.height,
    confidence: region.confidence,
    pageIndex,
  };
}

function resolveReaderFile(
  files: UploadedFile[],
  fallbackName?: string,
): UploadedFile {
  if (files.length > 0) return files[0]!;
  return {
    id: 'reader-selection',
    name: fallbackName?.trim() || 'Notes',
    type: 'txt',
    size: 0,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
  };
}

export function findOcclusionRegionForSelection(
  files: UploadedFile[],
  selection: string,
  readerText?: string,
  pageIndex = 0,
  fallbackFileName?: string,
): OcclusionSelectionMatch | null {
  const sel = selection.trim();
  if (!sel) return null;

  for (const file of files) {
    if (!file.ocrRegions?.length) continue;
    const normalized = normalizeStoredWordRegions(file.ocrRegions);
    for (const region of normalized) {
      if (regionMatchesSelection(region, sel) && isOcclusionCandidate(region)) {
        return { file, region };
      }
    }
  }

  for (const file of files) {
    const text = file.extractedText?.trim() || readerText?.trim() || '';
    if (!text) continue;
    const overlays = buildOcrOverlayRegions(text, pageIndex, file.ocrRegions);
    const hit = findOverlayRegionByText(overlays, sel)
      ?? overlays.find((o) => regionMatchesSelection(overlayToStored(o, pageIndex), sel));
    if (!hit) continue;
    const region = overlayToStored(hit, pageIndex);
    if (isOcclusionCandidate(region)) {
      return { file, region };
    }
  }

  if (readerText?.trim()) {
    const overlays = buildOcrOverlayRegions(readerText, pageIndex);
    const hit = findOverlayRegionByText(overlays, sel)
      ?? overlays.find((o) => regionMatchesSelection(overlayToStored(o, pageIndex), sel));
    if (hit) {
      const region = overlayToStored(hit, pageIndex);
      if (isOcclusionCandidate(region)) {
        return {
          file: resolveReaderFile(files, fallbackFileName),
          region,
        };
      }
    }
  }

  return null;
}

export function canMakeOcclusionFromSelection(
  files: UploadedFile[],
  selection: string,
  readerText?: string,
  fallbackFileName?: string,
): boolean {
  return findOcclusionRegionForSelection(
    files, selection, readerText, 0, fallbackFileName,
  ) != null;
}

export function buildOcclusionCardFromSelection(
  files: UploadedFile[],
  selection: string,
  lang: Lang,
  readerText?: string,
  fallbackFileName?: string,
): LeitnerCard | null {
  const match = findOcclusionRegionForSelection(
    files, selection, readerText, 0, fallbackFileName,
  );
  if (!match) return null;
  return buildOcclusionCardFromRegion(match.file, match.region, lang);
}
