/**
 * Sprint L17 — render PDF page-1 cover thumbnails during ingest (pdfjs + canvas).
 */

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDF_THUMBNAIL_PIPELINE_VERSION } from './pipelineConstants';

export const DEFAULT_THUMBNAIL_MAX_EDGE_PX = 144;
export const DEFAULT_THUMBNAIL_QUALITY = 0.82;
const RENDER_TIMEOUT_MS = 5_000;

export type PdfCoverThumbnail = {
  blob: Blob;
  width: number;
  height: number;
  pageIndex: number;
  format: 'webp' | 'png';
};

export type PdfThumbnailOptions = {
  pageIndex?: number;
  maxEdgePx?: number;
  format?: 'webp' | 'png';
  quality?: number;
};

type PdfPageLike = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

type PdfDocLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};

/** Scale so the longest edge fits `maxEdgePx` (floor 0.15 for tiny pages). */
export function computeThumbnailScale(
  viewportWidth: number,
  viewportHeight: number,
  maxEdgePx: number = DEFAULT_THUMBNAIL_MAX_EDGE_PX,
): number {
  const longest = Math.max(viewportWidth, viewportHeight, 1);
  return Math.max(0.15, maxEdgePx / longest);
}

function supportsWebp(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function createRenderCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: 'webp' | 'png',
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({
      type: format === 'webp' ? 'image/webp' : 'image/png',
      quality,
    });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas toBlob failed'))),
      format === 'webp' ? 'image/webp' : 'image/png',
      quality,
    );
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('thumbnail render timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function renderPdfPageFromPage(
  page: PdfPageLike,
  opts: PdfThumbnailOptions = {},
): Promise<PdfCoverThumbnail> {
  const pageIndex = opts.pageIndex ?? 0;
  const maxEdgePx = opts.maxEdgePx ?? DEFAULT_THUMBNAIL_MAX_EDGE_PX;
  const quality = opts.quality ?? DEFAULT_THUMBNAIL_QUALITY;
  const format = opts.format ?? (supportsWebp() ? 'webp' : 'png');

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = computeThumbnailScale(baseViewport.width, baseViewport.height, maxEdgePx);
  const viewport = page.getViewport({ scale });
  const canvas = createRenderCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
  const blob = await canvasToBlob(canvas, format, quality);

  return {
    blob,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    pageIndex,
    format,
  };
}

export async function renderPdfPageThumbnailFromDoc(
  doc: PdfDocLike,
  opts: PdfThumbnailOptions = {},
): Promise<PdfCoverThumbnail> {
  const pageIndex = opts.pageIndex ?? 0;
  if (doc.numPages < 1) throw new Error('PDF has no pages');
  const page = await doc.getPage(pageIndex + 1);
  return withTimeout(renderPdfPageFromPage(page, opts), RENDER_TIMEOUT_MS);
}

export async function renderPdfPageThumbnail(
  data: Uint8Array | ArrayBuffer,
  opts?: PdfThumbnailOptions,
): Promise<PdfCoverThumbnail> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    return await renderPdfPageThumbnailFromDoc(
      doc as unknown as PdfDocLike,
      opts,
    );
  } finally {
    void doc.destroy();
  }
}

export function thumbnailPipelineVersion(): string {
  return PDF_THUMBNAIL_PIPELINE_VERSION;
}
