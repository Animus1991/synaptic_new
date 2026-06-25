import type { UploadedFile } from '../types';
import type { SourceHighlight } from './conceptProvenance';
import { splitSentences } from './contentAnalysis';
import { conceptSalience } from './conceptSectionBinding';

export type TextSpanMatch = SourceHighlight & { excerpt: string };

/**
 * Find a character span for `query` in uploaded files.
 * Tries exact substring, then salient sentence match.
 */
export function findTextSpanInFiles(
  files: UploadedFile[],
  query: string,
): TextSpanMatch | null {
  const q = query.trim();
  if (!q) return null;

  const relevant = files.filter((f) => (f.extractedText?.trim().length ?? 0) > 15);
  const needle = q.slice(0, 120);

  for (const file of relevant) {
    const text = file.extractedText!.trim();
    const lower = text.toLowerCase();
    const idx = lower.indexOf(needle.toLowerCase());
    if (idx >= 0) {
      const end = Math.min(text.length, idx + Math.max(needle.length, 40));
      return {
        fileId: file.id,
        charStart: idx,
        charEnd: end,
        excerpt: text.slice(idx, end).trim(),
      };
    }
  }

  const words = q.split(/\s+/).filter((w) => w.length > 3).slice(0, 6);
  if (words.length >= 2) {
    const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.{0,48}');
    try {
      const re = new RegExp(pattern, 'i');
      for (const file of relevant) {
        const text = file.extractedText!.trim();
        const m = text.match(re);
        if (m?.index !== undefined) {
          return {
            fileId: file.id,
            charStart: m.index,
            charEnd: m.index + m[0].length,
            excerpt: m[0].trim(),
          };
        }
      }
    } catch {
      /* invalid regex — skip fuzzy */
    }
  }

  let best: TextSpanMatch | null = null;
  let bestSal = 0;
  for (const file of relevant) {
    const text = file.extractedText!.trim();
    for (const sent of splitSentences(text).slice(0, 200)) {
      const sal = conceptSalience(q, sent);
      if (sal <= bestSal) continue;
      const idx = text.indexOf(sent);
      if (idx < 0) continue;
      bestSal = sal;
      best = {
        fileId: file.id,
        charStart: idx,
        charEnd: idx + sent.length,
        excerpt: sent.trim(),
      };
    }
  }
  return bestSal >= 0.2 ? best : null;
}
