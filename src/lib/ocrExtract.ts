/**
 * OCR pipeline for scanned PDFs and image uploads.
 * Flow: text-layer extract → needsOcr? → server Tesseract (proxy) → client Tesseract fallback.
 */

import type { UserSettings } from '../types';
import { ocrPages as ocrPagesServer } from './authClient';
import { normalizeBilingualExtractedText, runClientBilingualOcrEnsemble } from './bilingualOcrEnsemble';
import { textLayerLooksCorrupted } from './textQualityMetrics';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const OCR_MIN_TOTAL_CHARS = 80;
export const OCR_MIN_CHARS_PER_PAGE = 28;
export const OCR_MAX_PAGES = 15;

export const OCR_RENDER_SCALE_SERVER = 2.25;
export const OCR_RENDER_SCALE_CLIENT = 2.5;

export type OcrExtractResult = {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
  ingestMethod?: 'text-layer' | 'ocr-server' | 'ocr-client' | 'ocr-ensemble';
  ocrRegions?: import('./readerOcrOverlay').OcrStoredRegion[];
  ocrModelsUsed?: string[];
};

function proxyConfigured(settings?: UserSettings): boolean {
  return !!(settings?.llmProxyUrl?.trim() || settings?.authProxyBase?.trim());
}

/**
 * Heuristic: PDF/image likely needs OCR when the text layer is nearly empty
 * or too sparse per page (scanned / image-only PDFs).
 */
export function needsOcr(text: string, pageCount = 1): boolean {
  const pages = text.split('\f').map((p) => p.replace(/\s+/g, ' ').trim());
  const effectivePages = Math.max(1, pageCount, pages.filter(Boolean).length || 1);
  const clean = text.replace(/\f/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < OCR_MIN_TOTAL_CHARS) return true;
  const perPage = clean.length / effectivePages;
  if (perPage < OCR_MIN_CHARS_PER_PAGE) return true;
  if (textLayerLooksCorrupted(clean)) return true;
  return false;
}

/** True when most PDF pages lack a meaningful text layer (image-only / scanned). */
export function isImageOnlyPdf(pageCharCounts: number[]): boolean {
  if (pageCharCounts.length === 0) return true;
  const sparse = pageCharCounts.filter((n) => n < OCR_MIN_CHARS_PER_PAGE).length;
  return sparse / pageCharCounts.length >= 0.75;
}

export function isImageUpload(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return (
    file.type.startsWith('image/')
    || ext === 'jpg'
    || ext === 'jpeg'
    || ext === 'png'
    || ext === 'webp'
    || ext === 'gif'
    || ext === 'bmp'
    || ext === 'tiff'
    || ext === 'tif'
  );
}

async function loadPdfDocument(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

/** Render PDF pages to JPEG base64 payloads for server-side OCR. */
export async function renderPdfPagesToBase64(file: File, maxPages = OCR_MAX_PAGES): Promise<string[]> {
  const doc = await loadPdfDocument(file);
  const limit = Math.min(doc.numPages, maxPages);
  const pages: string[] = [];

  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE_SERVER });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    pages.push(dataUrl.split(',')[1] ?? '');
  }

  return pages.filter(Boolean);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ocrPdfClient(file: File, pageCount: number, maxPages = OCR_MAX_PAGES): Promise<OcrExtractResult> {
  const doc = await loadPdfDocument(file);
  const limit = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];
  const modelsUsed = new Set<string>();

  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE_CLIENT });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const ensemble = await runClientBilingualOcrEnsemble(canvas);
    if (ensemble.text) {
      parts.push(ensemble.text);
      for (const m of ensemble.modelsUsed) modelsUsed.add(m);
    }
  }

  const text = normalizeBilingualExtractedText(parts.join('\n\f\n'));

  return {
    text,
    pageCount,
    ocrUsed: true,
    ingestMethod: 'ocr-ensemble',
    ocrModelsUsed: [...modelsUsed],
  };
}

async function ocrImageClient(file: File): Promise<OcrExtractResult> {
  const ensemble = await runClientBilingualOcrEnsemble(file);
  return {
    text: normalizeBilingualExtractedText(ensemble.text),
    pageCount: 1,
    ocrUsed: true,
    ingestMethod: 'ocr-ensemble',
    ocrModelsUsed: ensemble.modelsUsed,
  };
}

/**
 * Attempt OCR when the text layer is empty. Prefers server OCR when the Phase 6
 * proxy is configured; falls back to in-browser Tesseract.js.
 */
export async function extractWithOcrFallback(
  file: File,
  textLayer: { text: string; pageCount: number },
  settings?: UserSettings,
): Promise<OcrExtractResult> {
  if (isImageUpload(file)) {
    if (settings && proxyConfigured(settings)) {
      try {
        const buf = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        const remote = await ocrPagesServer(settings.authToken, settings, [base64], 1);
        if (remote.text.trim().length >= 20) {
          return {
            text: normalizeBilingualExtractedText(remote.text),
            pageCount: 1,
            ocrUsed: true,
            ingestMethod: 'ocr-server',
            ocrRegions: remote.regions,
            ocrModelsUsed: remote.modelsUsed,
          };
        }
      } catch {
        /* client fallback */
      }
    }
    return ocrImageClient(file);
  }

  if (!needsOcr(textLayer.text, textLayer.pageCount)) {
    return {
      ...textLayer,
      text: normalizeBilingualExtractedText(textLayer.text),
      ocrUsed: false,
      ingestMethod: 'text-layer',
      ocrModelsUsed: ['text-layer', 'greek-document-repair', 'unicode-nfc'],
    };
  }

  if (settings && proxyConfigured(settings)) {
    try {
      const pages = await renderPdfPagesToBase64(file);
      if (pages.length > 0) {
        const remote = await ocrPagesServer(
          settings.authToken,
          settings,
          pages,
          textLayer.pageCount,
        );
        if (remote.text.trim().length >= OCR_MIN_TOTAL_CHARS / 2) {
          return {
            text: normalizeBilingualExtractedText(remote.text),
            pageCount: textLayer.pageCount,
            ocrUsed: true,
            ingestMethod: 'ocr-server',
            ocrRegions: remote.regions,
            ocrModelsUsed: remote.modelsUsed,
          };
        }
      }
    } catch {
      /* client fallback */
    }
  }

  return ocrPdfClient(file, textLayer.pageCount);
}
