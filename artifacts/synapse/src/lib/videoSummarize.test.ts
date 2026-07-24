import { describe, it, expect } from 'vitest';
import { isMediaFile } from './videoSummarize';

describe('isMediaFile', () => {
  it('detects video extensions', () => {
    expect(isMediaFile({ name: 'lecture.mp4' })).toBe(true);
    expect(isMediaFile({ name: 'notes.pdf' })).toBe(false);
  });

  it('detects audio mime types', () => {
    expect(isMediaFile({ type: 'audio/mpeg', name: 'x' })).toBe(true);
  });
});
