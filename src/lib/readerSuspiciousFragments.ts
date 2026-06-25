/**
 * Detect suspicious OCR/formula headings in reader segments for caution UI.
 */

import { buildReaderSegments } from './readerDocumentLayout';
import { isSuspiciousStudyFragment } from './confidenceGating';

export type SuspiciousReaderSegment = {
  index: number;
  label: string;
};

export function findSuspiciousReaderSegments(text: string): SuspiciousReaderSegment[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const segments = buildReaderSegments(trimmed);
  const out: SuspiciousReaderSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.kind !== 'heading') continue;
    if (!isSuspiciousStudyFragment(seg.content)) continue;
    out.push({ index: i, label: seg.content.trim().slice(0, 72) });
  }
  return out;
}

export function isSuspiciousReaderSegmentIndex(
  text: string,
  segmentIndex: number,
): boolean {
  return findSuspiciousReaderSegments(text).some((s) => s.index === segmentIndex);
}
