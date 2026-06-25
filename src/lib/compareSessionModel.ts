/**
 * Compare session view-model — rows, weak-extraction flag, and UI metadata
 * for the workspace Compare tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry } from '../types';
import { extractComparisons } from './noteContentExtractors';
import { isGenericStudyConcept } from './workspaceContentFallback';

export type CompareRow = [string, string, string];

export type CompareSessionContent = {
  rows: CompareRow[];
  headers: [string, string, string];
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
};

export function filterCompareRows(rows: CompareRow[], query: string): CompareRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(q)),
  );
}

export function buildCompareSessionContent(opts: {
  concept: string;
  text: string;
  glossary: GlossaryEntry[];
  sectionLabel?: string;
  hasSource: boolean;
  lang: Lang;
}): CompareSessionContent {
  const { concept, text, glossary, sectionLabel, hasSource, lang } = opts;
  const isEl = lang === 'el';
  const headers: [string, string, string] = [
    isEl ? 'Διάσταση' : 'Dimension',
    isEl ? 'Α' : 'A',
    isEl ? 'Β' : 'B',
  ];

  if (!hasSource) {
    return {
      rows: [],
      headers,
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
    };
  }

  const rows = extractComparisons(text, concept, glossary);
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && rows.length > 0;
  const weakExtraction = generic || (rows.length === 0 && glossary.length < 2);

  return {
    rows,
    headers,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
  };
}
