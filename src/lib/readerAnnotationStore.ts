import { loadJson, saveJson } from './persistence';

export type ReaderAnnotation = {
  id: string;
  charStart: number;
  charEnd: number;
  color: string;
  note?: string;
  createdAt: string;
};

const KEY = 'reader-annotations';

export function loadReaderAnnotations(scopeKey: string): ReaderAnnotation[] {
  const all = loadJson<Record<string, ReaderAnnotation[]>>(KEY, {});
  return all[scopeKey] ?? [];
}

export function saveReaderAnnotations(scopeKey: string, items: ReaderAnnotation[]): void {
  const all = loadJson<Record<string, ReaderAnnotation[]>>(KEY, {});
  if (items.length === 0) delete all[scopeKey];
  else all[scopeKey] = items;
  saveJson(KEY, all);
}

export function exportReaderAnnotationsMarkdown(
  text: string,
  items: ReaderAnnotation[],
  sourceName?: string,
): string {
  const lines = [
    `# Reader annotations${sourceName ? ` — ${sourceName}` : ''}`,
    '',
    `Exported: ${new Date().toISOString()}`,
    '',
  ];
  const sorted = [...items].sort((a, b) => a.charStart - b.charStart);
  for (const ann of sorted) {
    const excerpt = text.slice(ann.charStart, ann.charEnd).replace(/\s+/g, ' ').trim();
    lines.push(`## ${excerpt.slice(0, 80)}${excerpt.length > 80 ? '…' : ''}`);
    lines.push('');
    lines.push(`> ${excerpt}`);
    if (ann.note?.trim()) {
      lines.push('');
      lines.push(ann.note.trim());
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function exportReaderAnnotationsJson(
  scopeKey: string,
  text: string,
  items: ReaderAnnotation[],
  sourceName?: string,
): string {
  return JSON.stringify(
    { scopeKey, sourceName, textLength: text.length, exportedAt: new Date().toISOString(), annotations: items },
    null,
    2,
  );
}

/** Split [start,end) into annotated segments for rendering. */
export function segmentAnnotatedRange(
  _text: string,
  annotations: ReaderAnnotation[],
  rangeStart: number,
  rangeEnd: number,
): { start: number; end: number; annotation?: ReaderAnnotation }[] {
  const relevant = annotations
    .filter((a) => a.charEnd > rangeStart && a.charStart < rangeEnd)
    .sort((a, b) => a.charStart - b.charStart);

  const segments: { start: number; end: number; annotation?: ReaderAnnotation }[] = [];
  let cursor = rangeStart;

  for (const ann of relevant) {
    const segStart = Math.max(ann.charStart, rangeStart);
    const segEnd = Math.min(ann.charEnd, rangeEnd);
    if (segStart > cursor) segments.push({ start: cursor, end: segStart });
    if (segEnd > segStart) segments.push({ start: segStart, end: segEnd, annotation: ann });
    cursor = Math.max(cursor, segEnd);
  }
  if (cursor < rangeEnd) segments.push({ start: cursor, end: rangeEnd });
  return segments;
}
