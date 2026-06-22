import { loadJson, saveJson } from './persistence';

export type StoredAnnotation = {
  id: string;
  type: 'highlight' | 'comment' | 'pin';
  text: string;
  color: string;
  lineStart: number;
  lineEnd: number;
  /** Optional glossary/concept tag linked to workspace focus. */
  focusTerm?: string;
  createdAt?: string;
};

export function loadAnnotations(fileKey: string): StoredAnnotation[] {
  return loadJson<StoredAnnotation[]>(`annotations:${fileKey}`, []);
}

export function saveAnnotations(fileKey: string, items: StoredAnnotation[]): void {
  saveJson(`annotations:${fileKey}`, items);
}

export function exportAnnotationsMarkdown(
  sourceName: string,
  lines: string[],
  items: StoredAnnotation[],
): string {
  const header = `# Annotations${sourceName ? ` — ${sourceName}` : ''}\n\nExported: ${new Date().toISOString()}\n`;
  const body = items
    .sort((a, b) => a.lineStart - b.lineStart)
    .map((ann) => {
      const excerpt = (lines[ann.lineStart] ?? '').trim();
      const parts = [
        `## Line ${ann.lineStart + 1} · ${ann.type}`,
        excerpt ? `> ${excerpt}` : '',
        ann.focusTerm ? `**Term:** ${ann.focusTerm}` : '',
        ann.text ? ann.text : '',
      ].filter(Boolean);
      return parts.join('\n\n');
    })
    .join('\n\n---\n\n');
  return `${header}\n${body}`;
}

export function exportAnnotationsJson(fileKey: string, items: StoredAnnotation[], sourceName?: string): string {
  return JSON.stringify({ fileKey, sourceName, exportedAt: new Date().toISOString(), annotations: items }, null, 2);
}

export function pickSourceText(
  uploadedFiles: { name: string; extractedText?: string }[],
  fallback = '',
): { text: string; name: string; fileKey: string } {
  const withText = uploadedFiles.find((f) => f.extractedText && f.extractedText.trim().length > 50);
  if (withText?.extractedText) {
    return { text: withText.extractedText, name: withText.name, fileKey: withText.name };
  }
  return { text: fallback, name: '', fileKey: 'no-source' };
}
