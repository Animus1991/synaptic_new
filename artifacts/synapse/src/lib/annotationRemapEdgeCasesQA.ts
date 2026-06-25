/**
 * Wave 6.8e — QA spine for annotation reprocess remap edge cases.
 */

import type { Lang } from './i18n';
import type { StoredAnnotation } from './annotationStore';
import {
  buildAnnotationRemapPlan,
  isAnnotationFlagged,
  isMultiLineAnnotation,
  type AnnotationRemapEntry,
} from './annotationAnchorRemap';

export type AnnotationRemapEdgeKind =
  | 'orphan-excerpt'
  | 'out-of-range-line'
  | 'ambiguous-match'
  | 'legacy-at-line'
  | 'empty-source'
  | 'multi-line-span'
  | 'short-excerpt'
  | 'no-candidates'
  | 'auto-remap-ready';

export type AnnotationRemapEdgeSummary = {
  annotationId: string;
  kind: AnnotationRemapEdgeKind;
  autoRemapEligible: boolean;
};

export type AnnotationRemapEdgeReport = {
  ok: boolean;
  flaggedCount: number;
  orphanCount: number;
  ambiguousCount: number;
  autoRemapReadyCount: number;
  multiLineCount: number;
  entries: AnnotationRemapEdgeSummary[];
};

const AMBIGUOUS_SCORE_DELTA = 0.08;

export function classifyAnnotationRemapEdgeCase(
  entry: AnnotationRemapEntry,
  lines: string[],
): AnnotationRemapEdgeSummary {
  const { annotation: ann, anchorExcerpt, candidates } = entry;

  if (lines.length === 0) {
    return { annotationId: ann.id, kind: 'empty-source', autoRemapEligible: false };
  }

  if (ann.anchorStatus === 'legacy' && ann.lineStart >= 0 && ann.lineStart < lines.length) {
    const lineText = (lines[ann.lineStart] ?? '').trim();
    if (lineText && candidates.length === 0) {
      return { annotationId: ann.id, kind: 'legacy-at-line', autoRemapEligible: false };
    }
  }

  if (!anchorExcerpt.trim() && (ann.lineStart < 0 || ann.lineStart >= lines.length)) {
    return { annotationId: ann.id, kind: 'out-of-range-line', autoRemapEligible: false };
  }

  if (anchorExcerpt.trim().length > 0 && anchorExcerpt.trim().length < 4) {
    if (candidates.length === 0) {
      return { annotationId: ann.id, kind: 'short-excerpt', autoRemapEligible: false };
    }
  }

  const high = candidates.filter((c) => c.confidence === 'high');
  if (high.length >= 2) {
    const delta = Math.abs(high[0]!.score - high[1]!.score);
    if (delta <= AMBIGUOUS_SCORE_DELTA) {
      return { annotationId: ann.id, kind: 'ambiguous-match', autoRemapEligible: false };
    }
  }

  if (candidates.length === 0) {
    return {
      annotationId: ann.id,
      kind: anchorExcerpt.trim() ? 'orphan-excerpt' : 'no-candidates',
      autoRemapEligible: false,
    };
  }

  if (isMultiLineAnnotation(ann)) {
    const best = candidates[0];
    if (best?.confidence === 'high') {
      return { annotationId: ann.id, kind: 'multi-line-span', autoRemapEligible: true };
    }
    return { annotationId: ann.id, kind: 'multi-line-span', autoRemapEligible: false };
  }

  if (candidates[0]?.confidence === 'high') {
    return { annotationId: ann.id, kind: 'auto-remap-ready', autoRemapEligible: true };
  }

  return { annotationId: ann.id, kind: 'no-candidates', autoRemapEligible: false };
}

export function auditAnnotationRemapEdgeCases(
  items: StoredAnnotation[],
  lines: string[],
): AnnotationRemapEdgeReport {
  const plan = buildAnnotationRemapPlan(items, lines);
  const entries = plan.map((entry) => classifyAnnotationRemapEdgeCase(entry, lines));

  const orphanCount = entries.filter((e) => e.kind === 'orphan-excerpt').length;
  const ambiguousCount = entries.filter((e) => e.kind === 'ambiguous-match').length;
  const autoRemapReadyCount = entries.filter((e) => e.autoRemapEligible).length;
  const multiLineCount = entries.filter((e) => e.kind === 'multi-line-span').length;

  const unresolvedOrphans = entries.filter(
    (e) => e.kind === 'orphan-excerpt' || e.kind === 'out-of-range-line' || e.kind === 'empty-source',
  );

  return {
    ok: unresolvedOrphans.length === 0 || entries.every((e) => e.kind !== 'empty-source'),
    flaggedCount: items.filter(isAnnotationFlagged).length,
    orphanCount,
    ambiguousCount,
    autoRemapReadyCount,
    multiLineCount,
    entries,
  };
}

export function remapEdgeCaseLabel(kind: AnnotationRemapEdgeKind, lang: Lang): string {
  const en: Record<AnnotationRemapEdgeKind, string> = {
    'orphan-excerpt': 'Deleted passage',
    'out-of-range-line': 'Line out of range',
    'ambiguous-match': 'Ambiguous match',
    'legacy-at-line': 'Legacy — confirm line',
    'empty-source': 'Empty source',
    'multi-line-span': 'Multi-line span',
    'short-excerpt': 'Short excerpt',
    'no-candidates': 'Manual pick needed',
    'auto-remap-ready': 'Auto-remap ready',
  };
  const el: Record<AnnotationRemapEdgeKind, string> = {
    'orphan-excerpt': 'Διαγραμμένο απόσπασμα',
    'out-of-range-line': 'Γραμμή εκτός ορίων',
    'ambiguous-match': 'Αμφίσημο ταίριασμα',
    'legacy-at-line': 'Legacy — επιβεβαίωση γραμμής',
    'empty-source': 'Κενή πηγή',
    'multi-line-span': 'Πολλαπλές γραμμές',
    'short-excerpt': 'Σύντομο απόσπασμα',
    'no-candidates': 'Χειροκίνητη επιλογή',
    'auto-remap-ready': 'Έτοιμο για auto-remap',
  };
  return (lang === 'el' ? el : en)[kind];
}

export function remapEdgeCaseHint(kind: AnnotationRemapEdgeKind, lang: Lang): string | null {
  const hints: Partial<Record<AnnotationRemapEdgeKind, { en: string; el: string }>> = {
    'orphan-excerpt': {
      en: 'Passage was removed — pick a new line or delete.',
      el: 'Το απόσπασμα αφαιρέθηκε — διάλεξε νέα γραμμή ή διέγραψε.',
    },
    'ambiguous-match': {
      en: 'Multiple similar lines — choose the correct one.',
      el: 'Πολλές παρόμοιες γραμμές — διάλεξε τη σωστή.',
    },
    'legacy-at-line': {
      en: 'Confirm the annotation still applies at this line.',
      el: 'Επιβεβαίωσε ότι η σημείωση ισχύει σε αυτή τη γραμμή.',
    },
    'multi-line-span': {
      en: 'Remap keeps the original line span where possible.',
      el: 'Το remap διατηρεί το εύρος γραμμών όπου είναι δυνατό.',
    },
    'short-excerpt': {
      en: 'Excerpt too short for fuzzy match — pick manually.',
      el: 'Πολύ σύντομο απόσπασμα — διάλεξε χειροκίνητα.',
    },
  };
  const row = hints[kind];
  if (!row) return null;
  return lang === 'el' ? row.el : row.en;
}

/** Summarize edge cases for the reprocess banner. */
export function formatRemapEdgeCaseBanner(
  report: AnnotationRemapEdgeReport,
  lang: Lang,
): string | null {
  if (report.flaggedCount === 0) return null;
  const parts: string[] = [];
  if (report.autoRemapReadyCount > 0) {
    parts.push(lang === 'el'
      ? `${report.autoRemapReadyCount} auto`
      : `${report.autoRemapReadyCount} auto`);
  }
  if (report.orphanCount > 0) {
    parts.push(lang === 'el'
      ? `${report.orphanCount} ορφανά`
      : `${report.orphanCount} orphan`);
  }
  if (report.ambiguousCount > 0) {
    parts.push(lang === 'el'
      ? `${report.ambiguousCount} αμφίσημα`
      : `${report.ambiguousCount} ambiguous`);
  }
  if (report.multiLineCount > 0) {
    parts.push(lang === 'el'
      ? `${report.multiLineCount} multi-line`
      : `${report.multiLineCount} multi-line`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function edgeKindForAnnotation(
  report: AnnotationRemapEdgeReport,
  annotationId: string,
): AnnotationRemapEdgeKind | null {
  return report.entries.find((e) => e.annotationId === annotationId)?.kind ?? null;
}
