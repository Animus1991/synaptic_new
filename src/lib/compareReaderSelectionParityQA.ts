/**
 * Wave 6.8i — QA spine for Compare §13.5 selection parity with Reader.
 */

import { t, type Lang } from './i18n';
import type { CompareRow } from './compareSessionModel';
import { isSuspiciousStudyFragment } from './confidenceGating';
import { normalizeBilingualExtractedText } from './bilingualOcrEnsemble';
import {
  getSelectionActionDefs,
  SELECTION_ACTION_ORDER,
  type WorkspaceSelectionContext,
} from './workspaceSelectionActions';

export type CompareSelectionIssue = {
  code:
    | 'open-reader-missing'
    | 'reader-action-gap'
    | 'empty-row-text'
    | 'handler-unwired'
    | 'ocr-noisy-row';
  message: string;
};

export type CompareRowParitySummary = {
  term: string;
  rowText: string;
  normalizedText: string;
  ocrNoisy: boolean;
  selectionContext: WorkspaceSelectionContext;
};

export type CompareReaderSelectionParityReport = {
  ok: boolean;
  selectionActionCount: number;
  readerVisibleActionCount: number;
  openReaderAvailable: boolean;
  rowCount: number;
  ocrRiskRowCount: number;
  selectionHandlerWired: boolean;
  issues: CompareSelectionIssue[];
  rows: CompareRowParitySummary[];
  bannerSummary: string | null;
};

export function buildCompareRowText(row: CompareRow): string {
  return row.filter(Boolean).join(' · ');
}

export function isCompareRowOcrNoisy(row: CompareRow): boolean {
  const text = buildCompareRowText(row);
  if (!text.trim()) return false;
  if (isSuspiciousStudyFragment(text)) return true;
  const tokens = text.split(/\s+/);
  const spacedGlyphs = tokens.filter((t) =>
    t.length === 1 && /\p{L}/u.test(t),
  ).length;
  return spacedGlyphs / Math.max(tokens.length, 1) > 0.22;
}

export function buildCompareSelectionContext(
  row: CompareRow,
  concept: string,
  sectionLabel?: string,
): WorkspaceSelectionContext {
  const raw = buildCompareRowText(row);
  return {
    text: normalizeBilingualExtractedText(raw),
    term: row[0]?.trim() || concept,
    sectionLabel,
    originTool: 'compare',
  };
}

export function auditCompareReaderSelectionParity(input: {
  lang: Lang;
  rows: CompareRow[];
  concept: string;
  sectionLabel?: string;
  selectionHandlerWired: boolean;
}): CompareReaderSelectionParityReport {
  const issues: CompareSelectionIssue[] = [];
  const compareDefs = getSelectionActionDefs(input.lang, 'compare');
  const readerDefs = getSelectionActionDefs(input.lang, 'reader');

  const openReaderAvailable = compareDefs.some((d) => d.id === 'open-reader');
  if (!openReaderAvailable) {
    issues.push({
      code: 'open-reader-missing',
      message: 'Open in Reader must be available from Compare row selections',
    });
  }

  const readerIds = new Set(readerDefs.map((d) => d.id));
  for (const def of compareDefs) {
    if (def.id === 'open-reader') continue;
    if (!readerIds.has(def.id)) {
      issues.push({
        code: 'reader-action-gap',
        message: `Compare exposes "${def.id}" but Reader hides it — parity gap`,
      });
    }
  }

  const expectedCompareCount = SELECTION_ACTION_ORDER.length;
  if (compareDefs.length !== expectedCompareCount) {
    issues.push({
      code: 'reader-action-gap',
      message: `Expected ${expectedCompareCount} Compare actions, got ${compareDefs.length}`,
    });
  }

  if (input.rows.length > 0 && !input.selectionHandlerWired) {
    issues.push({
      code: 'handler-unwired',
      message: 'Compare rows require onSelectionAction for §13.5 parity',
    });
  }

  const rows: CompareRowParitySummary[] = input.rows.map((row) => {
    const rowText = buildCompareRowText(row);
    const ctx = buildCompareSelectionContext(row, input.concept, input.sectionLabel);
    const ocrNoisy = isCompareRowOcrNoisy(row);
    if (!ctx.text.trim()) {
      issues.push({
        code: 'empty-row-text',
        message: `Compare row "${row[0] ?? '?'}" has empty selection text`,
      });
    }
    if (ocrNoisy) {
      issues.push({
        code: 'ocr-noisy-row',
        message: `Compare row "${row[0] ?? '?'}" may contain OCR noise — verify in Reader`,
      });
    }
    return {
      term: row[0] ?? '',
      rowText,
      normalizedText: ctx.text,
      ocrNoisy,
      selectionContext: ctx,
    };
  });

  const ocrRiskRowCount = rows.filter((r) => r.ocrNoisy).length;

  const bannerSummary = formatCompareParityBanner({
    selectionActionCount: compareDefs.length,
    rowCount: input.rows.length,
    ocrRiskRowCount,
    lang: input.lang,
  });

  return {
    ok: issues.filter((i) => i.code !== 'ocr-noisy-row').length === 0,
    selectionActionCount: compareDefs.length,
    readerVisibleActionCount: readerDefs.length,
    openReaderAvailable,
    rowCount: input.rows.length,
    ocrRiskRowCount,
    selectionHandlerWired: input.selectionHandlerWired,
    issues,
    rows,
    bannerSummary,
  };
}

export function formatCompareParityBanner(input: {
  selectionActionCount: number;
  rowCount: number;
  ocrRiskRowCount: number;
  lang: Lang;
}): string | null {
  if (input.rowCount === 0) return null;
  const lang = input.lang;
  const parts = [
    t('qaCompareSelActions', lang).replace('{count}', String(input.selectionActionCount)),
    t('qaCompareRows', lang).replace('{count}', String(input.rowCount)),
  ];
  if (input.ocrRiskRowCount > 0) {
    parts.push(t('qaCompareOcrRisk', lang).replace('{count}', String(input.ocrRiskRowCount)));
  }
  return parts.join(' · ');
}
