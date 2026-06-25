function escapeCsvCell(value: string): string {
  const s = value.replace(/\r\n/g, '\n');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** RFC 4180 CSV for comparison tables — harmonized with Compare tool rows. */
export function compareRowsToCsv(headers: string[], items: string[][]): string {
  const rows = [headers, ...items];
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? '')).join(',')).join('\n');
}

export function downloadCompareCsv(
  filename: string,
  title: string,
  headers: string[],
  items: string[][],
  concept?: string,
): void {
  const meta = concept ? `# ${title} — ${concept}\n` : `# ${title}\n`;
  const body = compareRowsToCsv(headers, items);
  const blob = new Blob([meta + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
