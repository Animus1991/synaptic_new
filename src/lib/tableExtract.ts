/**
 * Table extraction for Synapse sources.
 *
 * Recognizes Markdown pipe tables, whitespace-aligned plain-text tables, and
 * returns a normalized table representation that can be fed into the Compare
 * tool or used for grounded analysis.
 */

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  /** Best-guess title or caption from surrounding text. */
  title?: string;
  /** 0-based character offset where the table starts in the source text. */
  charStart?: number;
  /** 0-based character offset where the table ends. */
  charEnd?: number;
}

function splitMarkdownRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());
  if (cells.length < 2) return null;
  return cells;
}

function findTableTitle(lines: string[], startIndex: number): string | undefined {
  for (let i = Math.max(0, startIndex - 3); i < startIndex; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    if (/^(table|πίνακας)\b/i.test(line)) return line;
    if (/^[A-ZΑ-Ω]/.test(line) && line.length < 80 && !line.includes('|')) return line;
  }
  return undefined;
}

/**
 * Parse Markdown pipe tables from text. Returns a normalized table for each
 * valid Markdown table found.
 */
export function parseMarkdownTables(text: string): ExtractedTable[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tables: ExtractedTable[] = [];
  let i = 0;

  while (i < lines.length) {
    const headerCells = splitMarkdownRow(lines[i] ?? '');
    const align = lines[i + 1]?.trim() ?? '';
    const isAlignRow = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(align);
    if (headerCells && isAlignRow && headerCells.length >= 2) {
      const headers = headerCells;
      const rows: string[][] = [];
      const startIndex = i;
      i += 2;
      while (i < lines.length) {
        const row = splitMarkdownRow(lines[i] ?? '');
        if (!row) break;
        const padded = row.slice(0, headers.length);
        while (padded.length < headers.length) padded.push('');
        rows.push(padded);
        i++;
      }
      if (rows.length > 0) {
        const startLine = startIndex;
        const endLine = i - 1;
        const charStart = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
        const charEnd = lines.slice(0, endLine + 1).join('\n').length;
        tables.push({
          headers,
          rows,
          title: findTableTitle(lines, startIndex),
          charStart,
          charEnd,
        });
      }
      continue;
    }
    i++;
  }
  return tables;
}

/**
 * Detect plain-text tables that use at least two spaces between columns.
 * Heuristic: lines have the same number of whitespace-separated fields and
 * at least one line is all uppercase or contains numeric data.
 */
export function parsePlainTextTables(text: string): ExtractedTable[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tables: ExtractedTable[] = [];

  for (let i = 0; i < lines.length; i++) {
    const block: string[] = [];
    let j = i;
    while (j < lines.length && lines[j]!.trim().length > 0) {
      const cells = lines[j]!.trim().split(/\s{2,}/);
      if (cells.length < 2) break;
      block.push(lines[j]!.trim());
      j++;
    }
    if (block.length >= 3) {
      const widths = block.map((line) => line.trim().split(/\s{2,}/).length);
      const allSameWidth = widths.every((w) => w === widths[0]);
      const hasHeader = block[0] === block[0]!.toUpperCase() || /^[A-ZΑ-Ω]/.test(block[0]!);
      if (allSameWidth && hasHeader) {
        const headers = block[0]!.split(/\s{2,}/).map((c) => c.trim());
        const rows = block.slice(1).map((line) => {
          const cells = line.split(/\s{2,}/).map((c) => c.trim());
          while (cells.length < headers.length) cells.push('');
          return cells.slice(0, headers.length);
        });
        const charStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
        const charEnd = lines.slice(0, j).join('\n').length;
        tables.push({
          headers,
          rows,
          title: findTableTitle(lines, i),
          charStart,
          charEnd,
        });
      }
    }
    i = Math.max(i, j);
  }

  return tables;
}

/**
 * Extract all tables from a source text. Combines Markdown and plain-text
 * table detection and deduplicates overlapping results.
 */
export function extractTables(text: string): ExtractedTable[] {
  const md = parseMarkdownTables(text);
  const plain = parsePlainTextTables(text);
  const all = [...md, ...plain];

  // Deduplicate tables that overlap significantly (Markdown wins over plain).
  const deduped: ExtractedTable[] = [];
  for (const candidate of all) {
    const overlaps = deduped.some(
      (t) =>
        candidate.charStart !== undefined &&
        t.charStart !== undefined &&
        candidate.charEnd !== undefined &&
        t.charEnd !== undefined &&
        Math.max(candidate.charStart, t.charStart) < Math.min(candidate.charEnd, t.charEnd),
    );
    if (!overlaps) deduped.push(candidate);
  }

  return deduped;
}

/**
 * Convert a generic table into rows for the Compare tool. If the table has at
 * least two data columns, the first column is the dimension and the remaining
 * columns are the compared entities.
 */
export function tableToComparisonRows(table: ExtractedTable, conceptKey = ''): [string, string, string][] {
  if (table.headers.length < 3 || table.rows.length === 0) return [];
  const dimHeader = table.headers[0]!.trim();
  const out: [string, string, string][] = [];
  for (const row of table.rows) {
    const dim = (row[0] ?? dimHeader).trim();
    if (!dim) continue;
    for (let i = 1; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        const left = (row[i] ?? '').trim();
        const right = (row[j] ?? '').trim();
        if (left.length < 2 || right.length < 2 || left === right) continue;
        const label = dimHeader ? `${dim} (${table.headers[i]} vs ${table.headers[j]})` : dim;
        out.push([label.slice(0, 80), left.slice(0, 100), right.slice(0, 100)]);
      }
    }
  }

  if (conceptKey) {
    const concept = conceptKey.toLowerCase();
    const head = (dimHeader + ' ' + table.rows.map((r) => r[0] ?? '').join(' ')).toLowerCase();
    if (!head.includes(concept) && out.length > 4) return out.slice(0, 4);
  }

  return out;
}

/**
 * Render a table as a Markdown string for display or export.
 */
export function tableToMarkdown(table: ExtractedTable): string {
  const headerLine = '| ' + table.headers.join(' | ') + ' |';
  const alignLine = '| ' + table.headers.map(() => '---').join(' | ') + ' |';
  const rows = table.rows.map((r) => '| ' + r.join(' | ') + ' |');
  return [headerLine, alignLine, ...rows].join('\n');
}
