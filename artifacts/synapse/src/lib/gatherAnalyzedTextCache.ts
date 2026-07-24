import type { UploadedFile } from '../types';

export type GatheredText = {
  text: string;
  fileNames: string[];
  hasSource: boolean;
};

const cache = new Map<string, GatheredText>();
const MAX_CACHE = 12;

/** Stable key from course + analyzed file bodies (no full-text hash — length + prefix). */
export function gatherAnalyzedTextCacheKey(files: UploadedFile[], courseId?: string): string {
  const parts: string[] = [`c:${courseId ?? ''}`];
  for (const f of files) {
    if (f.status !== 'analyzed' && f.status !== 'processing') continue;
    if (courseId && f.courseId && f.courseId !== courseId) continue;
    const body = f.extractedText?.trim() ?? '';
    if (body.length < 40) continue;
    parts.push(`${f.id}:${body.length}:${body.slice(0, 120)}`);
  }
  return parts.join('|');
}

export function getCachedGatheredText(key: string): GatheredText | undefined {
  return cache.get(key);
}

export function setCachedGatheredText(key: string, value: GatheredText): void {
  if (cache.size >= MAX_CACHE && !cache.has(key)) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, value);
}

export function resetGatherAnalyzedTextCacheForTests(): void {
  cache.clear();
}
