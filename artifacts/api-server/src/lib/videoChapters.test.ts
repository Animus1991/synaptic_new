import { describe, it, expect } from 'vitest';
import {
  buildVideoChapters,
  formatChapterTimestamp,
  parseWhisperVerboseJson,
} from './videoChapters';

describe('videoChapters', () => {
  it('formats mm:ss timestamps', () => {
    expect(formatChapterTimestamp(65)).toBe('1:05');
    expect(formatChapterTimestamp(0)).toBe('0:00');
  });

  it('builds chapters from whisper segments', () => {
    const chapters = buildVideoChapters([
      { start: 0, end: 4, text: 'Introduction to limits.' },
      { start: 4.2, end: 10, text: 'We define epsilon delta.' },
      { start: 15, end: 22, text: 'Example with continuity.' },
    ]);
    expect(chapters.length).toBeGreaterThanOrEqual(2);
    expect(chapters[0]?.startSec).toBe(0);
    expect(chapters[0]?.title).toContain('Introduction');
  });

  it('parses verbose_json whisper payload', () => {
    const parsed = parseWhisperVerboseJson({
      text: 'Hello world',
      segments: [{ start: 0, end: 1.2, text: 'Hello' }, { start: 1.2, end: 2.5, text: ' world' }],
    });
    expect(parsed.text).toBe('Hello world');
    expect(parsed.segments).toHaveLength(2);
  });
});
