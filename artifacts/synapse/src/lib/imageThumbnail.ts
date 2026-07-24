/**
 * MD-05 — render a cover thumbnail from an uploaded image (same shape as PDF covers).
 */

import {
  DEFAULT_THUMBNAIL_MAX_EDGE_PX,
  DEFAULT_THUMBNAIL_QUALITY,
  computeThumbnailScale,
  type PdfCoverThumbnail,
} from './pdfThumbnail';
import { PDF_THUMBNAIL_PIPELINE_VERSION } from './pipelineConstants';

export type ImageCoverThumbnail = PdfCoverThumbnail;

function supportsWebp(): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  if (typeof document === 'undefined') return false;
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
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

async function decodeImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }
  throw new Error('createImageBitmap unavailable');
}

async function decodeViaHtmlImage(blob: Blob): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('HTML Image unavailable');
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image decode failed'));
      el.src = url;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => {
        ctx.drawImage(img, 0, 0, w, h);
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ImageThumbnailOptions = {
  maxEdgePx?: number;
  format?: 'webp' | 'png';
  quality?: number;
};

/** Downscale an image blob to a cover thumbnail for source list previews. */
export async function renderImageCoverThumbnail(
  source: Blob,
  opts: ImageThumbnailOptions = {},
): Promise<ImageCoverThumbnail> {
  const maxEdgePx = opts.maxEdgePx ?? DEFAULT_THUMBNAIL_MAX_EDGE_PX;
  const quality = opts.quality ?? DEFAULT_THUMBNAIL_QUALITY;
  const format = opts.format ?? (supportsWebp() ? 'webp' : 'png');

  let srcW: number;
  let srcH: number;
  let draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

  try {
    const bitmap = await decodeImageBitmap(source);
    srcW = bitmap.width;
    srcH = bitmap.height;
    draw = (ctx, w, h) => {
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
    };
  } catch {
    const decoded = await decodeViaHtmlImage(source);
    srcW = decoded.width;
    srcH = decoded.height;
    draw = decoded.draw;
  }

  if (srcW < 1 || srcH < 1) throw new Error('invalid image dimensions');

  const scale = computeThumbnailScale(srcW, srcH, maxEdgePx);
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    canvas = c;
  } else if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    throw new Error('canvas unavailable');
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('canvas 2d context unavailable');
  draw(ctx, width, height);
  const blob = await canvasToBlob(canvas, format, quality);

  return {
    blob,
    width,
    height,
    pageIndex: 0,
    format,
  };
}

export function imageThumbnailPipelineVersion(): string {
  return PDF_THUMBNAIL_PIPELINE_VERSION;
}
