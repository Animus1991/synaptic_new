/**
 * Client bridge for off-thread PDF cover thumbnail rendering (large scans).
 */

import {
  renderPdfPageThumbnail,
  type PdfCoverThumbnail,
  type PdfThumbnailOptions,
} from './pdfThumbnail';
import type {
  PdfThumbnailWorkerRequest,
  PdfThumbnailWorkerResponse,
} from '../workers/pdfThumbnail.worker';

/** Use worker when PDF is large enough to risk main-thread jank during ingest. */
export const WORKER_THUMBNAIL_PAGE_THRESHOLD = 50;
export const WORKER_THUMBNAIL_BYTES_THRESHOLD = 5_000_000;

let worker: Worker | null = null;

export function getPdfThumbnailWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/pdfThumbnail.worker.ts', import.meta.url), {
      type: 'module',
    });
    return worker;
  } catch {
    return null;
  }
}

export function shouldRenderThumbnailInWorker(pageCount: number, fileSize: number): boolean {
  return pageCount > WORKER_THUMBNAIL_PAGE_THRESHOLD || fileSize > WORKER_THUMBNAIL_BYTES_THRESHOLD;
}

export function renderPdfThumbnailInWorker(
  data: Uint8Array | ArrayBuffer,
  opts?: PdfThumbnailOptions,
): Promise<PdfCoverThumbnail> {
  const w = getPdfThumbnailWorker();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!w) return renderPdfPageThumbnail(bytes, opts);

  return new Promise((resolve, reject) => {
    const id = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const onMessage = (ev: MessageEvent<PdfThumbnailWorkerResponse>) => {
      if (ev.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (ev.data.type === 'error') {
        renderPdfPageThumbnail(bytes, opts).then(resolve).catch(reject);
        return;
      }
      if (ev.data.type === 'result') {
        resolve({
          blob: new Blob([ev.data.buffer], { type: ev.data.format === 'webp' ? 'image/webp' : 'image/png' }),
          width: ev.data.width,
          height: ev.data.height,
          pageIndex: ev.data.pageIndex,
          format: ev.data.format,
        });
        return;
      }
      reject(new Error('PDF thumbnail worker returned unexpected response'));
    };
    w.addEventListener('message', onMessage);
    try {
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const request: PdfThumbnailWorkerRequest = {
        id,
        type: 'render',
        buffer,
        opts,
      };
      w.postMessage(request, [buffer]);
    } catch {
      w.removeEventListener('message', onMessage);
      renderPdfPageThumbnail(bytes, opts).then(resolve).catch(reject);
    }
  });
}

export async function renderPdfCoverFromBytes(
  data: Uint8Array | ArrayBuffer,
  hints?: { pageCount?: number; fileSize?: number },
  opts?: PdfThumbnailOptions,
): Promise<PdfCoverThumbnail> {
  const pageCount = hints?.pageCount ?? 0;
  const fileSize = hints?.fileSize ?? 0;
  if (shouldRenderThumbnailInWorker(pageCount, fileSize)) {
    return renderPdfThumbnailInWorker(data, opts);
  }
  return renderPdfPageThumbnail(data, opts);
}

/** Reset singleton for unit tests. */
export function resetPdfThumbnailWorkerForTests(): void {
  worker?.terminate();
  worker = null;
}
