import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { renderPdfPageThumbnail, type PdfThumbnailOptions } from '../lib/pdfThumbnail';

export type PdfThumbnailWorkerRequest = {
  id: string;
  type: 'render';
  buffer: ArrayBuffer;
  opts?: PdfThumbnailOptions;
};

export type PdfThumbnailWorkerResult = {
  id: string;
  type: 'result';
  buffer: ArrayBuffer;
  width: number;
  height: number;
  pageIndex: number;
  format: 'webp' | 'png';
};

export type PdfThumbnailWorkerError = {
  id: string;
  type: 'error';
  message: string;
};

export type PdfThumbnailWorkerResponse = PdfThumbnailWorkerResult | PdfThumbnailWorkerError;

self.onmessage = async (event: MessageEvent<PdfThumbnailWorkerRequest>) => {
  const { id, type, buffer, opts } = event.data;
  if (type !== 'render') return;
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const cover = await renderPdfPageThumbnail(buffer, opts);
    const ab = await cover.blob.arrayBuffer();
    const response: PdfThumbnailWorkerResult = {
      id,
      type: 'result',
      buffer: ab,
      width: cover.width,
      height: cover.height,
      pageIndex: cover.pageIndex,
      format: cover.format,
    };
    self.postMessage(response, { transfer: [ab] });
  } catch (err) {
    const response: PdfThumbnailWorkerError = {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
