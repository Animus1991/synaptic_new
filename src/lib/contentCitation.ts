import type { UploadedFile } from '../types';
import { findTextSpanInFiles, type TextSpanMatch } from './findTextSpanInSource';

export type ContentCitation = {
  fileId: string;
  fileName?: string;
  charStart: number;
  charEnd: number;
  excerpt?: string;
};

export function resolveContentCitation(
  files: UploadedFile[],
  anchorText: string,
): ContentCitation | null {
  const match = findTextSpanInFiles(files, anchorText);
  if (!match) return null;
  const file = files.find((f) => f.id === match.fileId);
  return spanToCitation(match, file?.name);
}

export function spanToCitation(
  span: TextSpanMatch,
  fileName?: string,
): ContentCitation {
  return {
    fileId: span.fileId,
    fileName,
    charStart: span.charStart,
    charEnd: span.charEnd,
    excerpt: span.excerpt,
  };
}

export function citationReaderQuery(citation: ContentCitation): string {
  return citation.excerpt?.trim() || '';
}
