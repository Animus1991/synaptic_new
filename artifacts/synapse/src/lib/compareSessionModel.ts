/**
 * Compare session view-model — rows, weak-extraction flag, and UI metadata
 * for the workspace Compare tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry } from '../types';
import { extractComparisons, relevantExcerpt } from './noteContentExtractors';
import { extractTables } from './tableExtract';
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

/**
 * Derive real comparison column labels from the source. Only when the notes
 * contain exactly one structured 3-column comparison table do we name the two
 * entity columns after that table's own headers — the highest-confidence grounded
 * signal. In every other (heterogeneous / unstructured) case we return null so
 * the caller falls back to honest neutral labels rather than guessing identities.
 */
export function deriveCompareHeaders(text: string, concept: string): [string, string] | null {
  if (!text.trim()) return null;
  const tables = extractTables(relevantExcerpt(text, concept, 14000));
  const threeCol = tables.filter((t) => t.headers.length === 3 && t.rows.length > 0);
  if (threeCol.length !== 1) return null;
  const h1 = (threeCol[0]!.headers[1] ?? '').trim();
  const h2 = (threeCol[0]!.headers[2] ?? '').trim();
  if (h1.length < 2 || h2.length < 2 || h1.toLowerCase() === h2.toLowerCase()) return null;
  return [h1.slice(0, 40), h2.slice(0, 40)];
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
  const derived = hasSource ? deriveCompareHeaders(text, concept) : null;
  const headers: [string, string, string] = [
    isEl ? 'Διάσταση' : 'Dimension',
    derived ? derived[0] : (isEl ? 'Στοιχείο 1' : 'Item 1'),
    derived ? derived[1] : (isEl ? 'Στοιχείο 2' : 'Item 2'),
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
