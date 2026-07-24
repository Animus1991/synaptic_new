/**
 * Source anchoring + reprocess safety for margin annotations.
 */

import type { StoredAnnotation, AnnotationCategory, AnnotationAnchorStatus } from './annotationStore';
import { hasStoredLineSpan, resolveSpanOffsetsInLine, spanExcerptFromLine } from './annotationSpan';
import type { ConceptSignal } from './workspaceConceptBus';

export type AnnotationCreatedPayload = {
  focusTerm?: string;
  category?: AnnotationCategory;
  excerpt: string;
};

export type AnnotationAnchorMeta = {
  courseId?: string;
  fileKey: string;
  pipelineVersion?: string;
  excerpt: string;
  sectionLabel?: string;
};

/** Build anchor metadata from the line being annotated. */
export function buildAnnotationAnchor(
  fileKey: string,
  lines: string[],
  lineStart: number,
  opts?: {
    courseId?: string;
    pipelineVersion?: string;
    sectionLabel?: string;
    charStart?: number;
    charEnd?: number;
  },
): AnnotationAnchorMeta {
  const line = lines[lineStart] ?? '';
  const excerpt = spanExcerptFromLine(line, opts?.charStart, opts?.charEnd);
  return {
    courseId: opts?.courseId,
    fileKey,
    pipelineVersion: opts?.pipelineVersion,
    excerpt,
    sectionLabel: opts?.sectionLabel,
  };
}

/** Find best line index for a stored excerpt after source text changes. */
export function resolveAnnotationLineIndex(excerpt: string, lines: string[]): number | null {
  const needle = excerpt.trim();
  if (!needle || needle.length < 4) return null;

  const direct = lines.findIndex((l) => l.includes(needle) || needle.includes(l.trim()));
  if (direct >= 0) return direct;

  const prefix = needle.slice(0, Math.min(48, needle.length));
  if (prefix.length >= 8) {
    const partial = lines.findIndex((l) => l.trim().includes(prefix));
    if (partial >= 0) return partial;
  }

  return null;
}

export function conceptSignalForAnnotationCategory(category: AnnotationCategory): ConceptSignal {
  switch (category) {
    case 'confusing':
      return 'annotated-confusing';
    case 'exam-relevant':
      return 'annotated-exam';
    case 'important':
    case 'definition':
      return 'annotated';
    default:
      return 'annotated';
  }
}

export function annotationCategoryAffectsWeakSpots(category: AnnotationCategory): boolean {
  return category === 'confusing';
}

/** After reprocess: re-resolve lines or flag for review. */
export function refreshAnnotationsAfterReprocess(
  items: StoredAnnotation[],
  newLines: string[],
  newPipelineVersion?: string,
): StoredAnnotation[] {
  return items.map((ann) => {
    const excerpt = ann.anchor?.excerpt ?? (ann.lineStart >= 0 ? '' : '');
    const lineFromExcerpt = excerpt ? resolveAnnotationLineIndex(excerpt, newLines) : null;
    const lineInRange = ann.lineStart >= 0 && ann.lineStart < newLines.length
      ? ann.lineStart
      : null;
    const resolvedLine = lineFromExcerpt ?? lineInRange;

    if (resolvedLine == null) {
      return {
        ...ann,
        anchorStatus: 'needs-review' as AnnotationAnchorStatus,
        anchor: ann.anchor
          ? { ...ann.anchor, pipelineVersion: newPipelineVersion ?? ann.anchor.pipelineVersion }
          : ann.anchor,
      };
    }

    const lineText = (newLines[resolvedLine] ?? '').trim();
    const spanOffsets = excerpt ? resolveSpanOffsetsInLine(newLines[resolvedLine] ?? '', excerpt) : null;
    const excerptStillMatches = !excerpt
      || lineText.includes(excerpt.slice(0, 32))
      || excerpt.includes(lineText.slice(0, 32))
      || spanOffsets != null;

    return {
      ...ann,
      lineStart: resolvedLine,
      lineEnd: Math.max(resolvedLine, ann.lineEnd <= resolvedLine ? resolvedLine : ann.lineEnd),
      charStart: spanOffsets?.charStart ?? (hasStoredLineSpan(ann) ? undefined : ann.charStart),
      charEnd: spanOffsets?.charEnd ?? (hasStoredLineSpan(ann) ? undefined : ann.charEnd),
      anchorStatus: excerptStillMatches ? 'ok' : ('needs-review' as AnnotationAnchorStatus),
      anchor: {
        ...(ann.anchor ?? { fileKey: '', excerpt: excerpt || lineText.slice(0, 240) }),
        pipelineVersion: newPipelineVersion ?? ann.anchor?.pipelineVersion,
        excerpt: excerpt || lineText.slice(0, 240),
      },
    };
  });
}

/** Stamp legacy status when pipeline version differs from anchor. */
export function normalizeAnnotationAnchorStatus(
  ann: StoredAnnotation,
  currentPipelineVersion?: string,
): StoredAnnotation {
  if (!ann.anchor?.pipelineVersion || !currentPipelineVersion) return ann;
  if (ann.anchor.pipelineVersion === currentPipelineVersion) {
    return ann.anchorStatus === 'legacy' ? { ...ann, anchorStatus: 'ok' } : ann;
  }
  if (ann.anchorStatus === 'needs-review') return ann;
  return { ...ann, anchorStatus: 'legacy' };
}

export function countAnnotationsNeedingReview(items: StoredAnnotation[]): number {
  return items.filter((a) => a.anchorStatus === 'needs-review' || a.anchorStatus === 'legacy').length;
}
