import type { SourceThumbnailRef, UploadedFile } from '../types';
import { idbSaveThumbnail } from './indexedDbStorage';
import type { PdfCoverThumbnail } from './pdfThumbnail';
import { PDF_THUMBNAIL_PIPELINE_VERSION } from './pipelineConstants';

export function thumbnailStorageKey(fileId: string): string {
  return `${fileId}:cover`;
}

export function buildSourceThumbnailRef(
  fileId: string,
  cover: PdfCoverThumbnail,
): SourceThumbnailRef {
  return {
    storageKey: thumbnailStorageKey(fileId),
    pageIndex: cover.pageIndex,
    width: cover.width,
    height: cover.height,
    format: cover.format,
    pipelineVersion: PDF_THUMBNAIL_PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

/** Persist cover blob to IDB and attach metadata on the file record. */
export async function persistCoverThumbnailOnFile(
  file: UploadedFile,
  cover: PdfCoverThumbnail,
): Promise<UploadedFile> {
  const storageKey = thumbnailStorageKey(file.id);
  try {
    await idbSaveThumbnail(storageKey, cover.blob);
    return {
      ...file,
      thumbnailRef: buildSourceThumbnailRef(file.id, cover),
      thumbnailStatus: 'ready',
    };
  } catch {
    return { ...file, thumbnailStatus: 'failed' };
  }
}
