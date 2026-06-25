import { loadJson, saveJson } from './persistence';
import { refreshAnnotationsAfterReprocess } from './annotationAnchor';

export type AnnotationCategory =
  | 'general'
  | 'confusing'
  | 'exam-relevant'
  | 'important'
  | 'definition';

export type AnnotationAnchorStatus = 'ok' | 'needs-review' | 'legacy';

export type AnnotationAnchor = {
  courseId?: string;
  fileKey: string;
  pipelineVersion?: string;
  excerpt: string;
  sectionLabel?: string;
};

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
  /** Semantic learning tag (confusing, exam-relevant, …). */
  category?: AnnotationCategory;
  /** Source grounding for reprocess migration. */
  anchor?: AnnotationAnchor;
  anchorStatus?: AnnotationAnchorStatus;
};

export function loadAnnotations(fileKey: string): StoredAnnotation[] {
  return loadJson<StoredAnnotation[]>(`annotations:${fileKey}`, []);
}

export function saveAnnotations(fileKey: string, items: StoredAnnotation[]): void {
  saveJson(`annotations:${fileKey}`, items);
}

/** Reprocess all annotations for a file key against refreshed source text. */
export function reprocessFileAnnotations(
  fileKey: string,
  newSourceText: string,
  pipelineVersion?: string,
): StoredAnnotation[] {
  const lines = newSourceText.split('\n');
  const refreshed = refreshAnnotationsAfterReprocess(loadAnnotations(fileKey), lines, pipelineVersion);
  saveAnnotations(fileKey, refreshed);
  return refreshed;
}

export function reprocessCourseAnnotations(
  fileKeys: string[],
  textByFileKey: Record<string, string>,
  pipelineVersion?: string,
): number {
  let flagged = 0;
  for (const key of fileKeys) {
    const text = textByFileKey[key];
    if (!text?.trim()) continue;
    const items = reprocessFileAnnotations(key, text, pipelineVersion);
    flagged += items.filter((a) => a.anchorStatus === 'needs-review' || a.anchorStatus === 'legacy').length;
  }
  return flagged;
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
        `## Line ${ann.lineStart + 1} · ${ann.type}${ann.category ? ` · ${ann.category}` : ''}`,
        excerpt ? `> ${excerpt}` : '',
        ann.focusTerm ? `**Term:** ${ann.focusTerm}` : '',
        ann.anchorStatus && ann.anchorStatus !== 'ok' ? `**Status:** ${ann.anchorStatus}` : '',
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
