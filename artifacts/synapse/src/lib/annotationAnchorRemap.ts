/**
 * Wave 6.4 — Interactive annotation anchor remap after reprocess.
 */

import type { StoredAnnotation } from './annotationStore';
import { resolveAnnotationLineIndex } from './annotationAnchor';

export type RemapConfidence = 'high' | 'medium' | 'low';

export type AnnotationRemapCandidate = {
  lineIndex: number;
  preview: string;
  confidence: RemapConfidence;
  score: number;
};

export type AnnotationRemapEntry = {
  annotation: StoredAnnotation;
  candidates: AnnotationRemapCandidate[];
  anchorExcerpt: string;
};

function tokenOverlapScore(excerpt: string, line: string, focusTerm?: string): number {
  const e = excerpt.trim().toLowerCase();
  const l = line.trim().toLowerCase();
  if (!e || !l) return 0;
  if (l.includes(e) || e.includes(l)) return 1;

  const eWords = e.split(/\s+/).filter((w) => w.length >= 3);
  if (eWords.length === 0) return 0;

  let hits = 0;
  for (const w of eWords) {
    if (l.includes(w)) hits += 1;
  }
  let score = hits / eWords.length;
  if (focusTerm && l.includes(focusTerm.trim().toLowerCase())) {
    score = Math.min(1, score + 0.15);
  }
  return score;
}

function confidenceForScore(score: number): RemapConfidence {
  if (score >= 0.65) return 'high';
  if (score >= 0.35) return 'medium';
  return 'low';
}

/** Rank candidate lines for re-anchoring a flagged annotation. */
export function suggestAnnotationRemapCandidates(
  ann: StoredAnnotation,
  lines: string[],
  max = 5,
): AnnotationRemapCandidate[] {
  const excerpt = ann.anchor?.excerpt ?? (lines[ann.lineStart] ?? '').trim();
  if (!excerpt && ann.lineStart >= 0 && ann.lineStart < lines.length) {
    const preview = (lines[ann.lineStart] ?? '').trim();
    if (preview) {
      return [{
        lineIndex: ann.lineStart,
        preview: preview.slice(0, 120),
        confidence: 'medium',
        score: 0.5,
      }];
    }
  }

  const direct = excerpt ? resolveAnnotationLineIndex(excerpt, lines) : null;
  const scored: AnnotationRemapCandidate[] = [];

  if (direct != null) {
    const preview = (lines[direct] ?? '').trim();
    scored.push({
      lineIndex: direct,
      preview: preview.slice(0, 120),
      confidence: 'high',
      score: 1,
    });
  }

  lines.forEach((line, lineIndex) => {
    if (direct != null && lineIndex === direct) return;
    const score = tokenOverlapScore(excerpt, line, ann.focusTerm);
    if (score < 0.2) return;
    scored.push({
      lineIndex,
      preview: line.trim().slice(0, 120),
      confidence: confidenceForScore(score),
      score,
    });
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<number>();
  const out: AnnotationRemapCandidate[] = [];
  for (const row of scored) {
    if (seen.has(row.lineIndex)) continue;
    seen.add(row.lineIndex);
    out.push(row);
    if (out.length >= max) break;
  }
  return out;
}

export function isAnnotationFlagged(ann: StoredAnnotation): boolean {
  return ann.anchorStatus === 'needs-review' || ann.anchorStatus === 'legacy';
}

export function isMultiLineAnnotation(ann: StoredAnnotation): boolean {
  return ann.lineEnd > ann.lineStart;
}

export function clampRemapLineIndex(lineIndex: number, lineCount: number): number {
  if (lineCount <= 0) return 0;
  return Math.min(Math.max(lineIndex, 0), lineCount - 1);
}

export function resolveRemappedLineEnd(
  lineStart: number,
  ann: StoredAnnotation,
  lineCount: number,
): number {
  if (lineCount <= 0) return lineStart;
  const span = Math.max(0, ann.lineEnd - ann.lineStart);
  return Math.min(lineStart + span, lineCount - 1);
}

export function buildAnnotationRemapPlan(
  items: StoredAnnotation[],
  lines: string[],
): AnnotationRemapEntry[] {
  if (lines.length === 0) {
    return items.filter(isAnnotationFlagged).map((annotation) => ({
      annotation,
      anchorExcerpt: annotation.anchor?.excerpt ?? '',
      candidates: [],
    }));
  }
  return items
    .filter(isAnnotationFlagged)
    .map((annotation) => {
      const anchorExcerpt = annotation.anchor?.excerpt
        ?? (lines[annotation.lineStart] ?? '').trim();
      return {
        annotation,
        anchorExcerpt,
        candidates: suggestAnnotationRemapCandidates(annotation, lines),
      };
    });
}

export function remapAnnotationToLine(
  ann: StoredAnnotation,
  lineIndex: number,
  lines: string[],
  pipelineVersion?: string,
): StoredAnnotation {
  const safeIndex = clampRemapLineIndex(lineIndex, lines.length);
  const lineText = (lines[safeIndex] ?? '').trim();
  const lineEnd = resolveRemappedLineEnd(safeIndex, ann, lines.length);
  return {
    ...ann,
    lineStart: safeIndex,
    lineEnd,
    anchorStatus: 'ok',
    anchor: {
      fileKey: ann.anchor?.fileKey ?? '',
      courseId: ann.anchor?.courseId,
      sectionLabel: ann.anchor?.sectionLabel,
      excerpt: lineText.slice(0, 240) || ann.anchor?.excerpt || '',
      pipelineVersion: pipelineVersion ?? ann.anchor?.pipelineVersion,
    },
  };
}

/** Confirm a legacy annotation still valid at its current line. */
export function confirmLegacyAnnotationAtLine(
  ann: StoredAnnotation,
  lines: string[],
  pipelineVersion?: string,
): StoredAnnotation {
  const line = Math.min(Math.max(ann.lineStart, 0), lines.length - 1);
  return remapAnnotationToLine(ann, line, lines, pipelineVersion);
}

export type AutoRemapResult = {
  items: StoredAnnotation[];
  remapped: number;
  stillFlagged: number;
};

/** Auto-apply only high-confidence remaps for flagged annotations. */
export function autoRemapAnnotations(
  items: StoredAnnotation[],
  lines: string[],
  pipelineVersion?: string,
): AutoRemapResult {
  let remapped = 0;
  const next = items.map((ann) => {
    if (!isAnnotationFlagged(ann)) return ann;
    if (lines.length === 0) return ann;
    const candidates = suggestAnnotationRemapCandidates(ann, lines, 3);
    const best = candidates[0];
    if (!best || best.confidence !== 'high') return ann;
    const high = candidates.filter((c) => c.confidence === 'high');
    if (high.length >= 2 && Math.abs(high[0]!.score - high[1]!.score) <= 0.08) return ann;
    remapped += 1;
    return remapAnnotationToLine(ann, best.lineIndex, lines, pipelineVersion);
  });
  return {
    items: next,
    remapped,
    stillFlagged: next.filter(isAnnotationFlagged).length,
  };
}
