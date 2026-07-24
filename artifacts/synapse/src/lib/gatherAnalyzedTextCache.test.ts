import { describe, expect, it } from 'vitest';
import type { UploadedFile } from '../types';
import { gatherAnalyzedText } from './noteContentExtractors';
import {
  gatherAnalyzedTextCacheKey,
  getCachedGatheredText,
  resetGatherAnalyzedTextCacheForTests,
} from './gatherAnalyzedTextCache';

const mkFile = (id: string, text: string, courseId = 'c1'): UploadedFile => ({
  id,
  name: `${id}.pdf`,
  type: 'pdf',
  size: text.length,
  uploadedAt: '2026-06-21T10:00:00.000Z',
  status: 'analyzed',
  progress: 100,
  courseId,
  extractedText: text,
});

describe('gatherAnalyzedTextCache', () => {
  it('returns cached join without re-scanning files', () => {
    resetGatherAnalyzedTextCacheForTests();
    const longBody = `${'A'.repeat(120)}${'B'.repeat(80)}`;
    const files = [mkFile('f1', longBody)];
    const first = gatherAnalyzedText(files, 'c1');
    const key = gatherAnalyzedTextCacheKey(files, 'c1');
    expect(getCachedGatheredText(key)).toEqual(first);

    // Mutate suffix only — cache key uses length + first 120 chars, so hit stays valid.
    files[0] = { ...files[0], extractedText: `${'A'.repeat(120)}${'Z'.repeat(80)}` };
    const second = gatherAnalyzedText(files, 'c1');
    expect(second).toEqual(first);
  });

  it('cache key changes when file body length changes', () => {
    const a = [mkFile('f1', 'B'.repeat(80))];
    const b = [mkFile('f1', 'B'.repeat(81))];
    expect(gatherAnalyzedTextCacheKey(a, 'c1')).not.toBe(gatherAnalyzedTextCacheKey(b, 'c1'));
  });
});
