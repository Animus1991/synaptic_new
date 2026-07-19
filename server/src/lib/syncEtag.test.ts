import { describe, expect, it } from 'vitest';
import { etagFromUpdatedAt, ifMatchSatisfied, parseIfMatch } from './syncEtag';

describe('syncEtag', () => {
  it('builds weak etags from updatedAt', () => {
    expect(etagFromUpdatedAt('2026-07-19T00:00:00.000Z')).toBe('W/"2026-07-19T00:00:00.000Z"');
  });

  it('parses weak and strong tags', () => {
    expect(parseIfMatch('W/"abc"')).toBe('abc');
    expect(parseIfMatch('"abc"')).toBe('abc');
  });

  it('treats missing If-Match as satisfied (backward compatible)', () => {
    expect(ifMatchSatisfied(undefined, '2026-07-19T00:00:00.000Z')).toBe(true);
  });

  it('rejects mismatched If-Match', () => {
    expect(ifMatchSatisfied('W/"old"', '2026-07-19T00:00:00.000Z')).toBe(false);
  });

  it('accepts matching If-Match', () => {
    expect(ifMatchSatisfied('W/"2026-07-19T00:00:00.000Z"', '2026-07-19T00:00:00.000Z')).toBe(true);
  });
});
