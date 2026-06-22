import { describe, it, expect } from 'vitest';
import { extractYoutubeVideoId, isAudioVideoFile, extractMediaTranscript } from './youtubeTranscript';

describe('youtubeTranscript', () => {
  it('extracts YouTube video IDs from URLs', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=abc123def45')).toBe('abc123def45');
    expect(extractYoutubeVideoId('https://youtu.be/abc123def45')).toBe('abc123def45');
    expect(extractYoutubeVideoId('https://www.youtube.com/embed/abc123def45')).toBe('abc123def45');
    expect(extractYoutubeVideoId('abc123def45')).toBe('abc123def45');
    expect(extractYoutubeVideoId('https://example.com/video')).toBeNull();
  });

  it('detects audio and video files', () => {
    const audio = new File(['x'], 'lecture.mp3', { type: 'audio/mpeg' });
    const video = new File(['x'], 'lecture.mp4', { type: 'video/mp4' });
    const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
    expect(isAudioVideoFile(audio)).toBe(true);
    expect(isAudioVideoFile(video)).toBe(true);
    expect(isAudioVideoFile(pdf)).toBe(false);
  });

  it('returns null for non-media input', async () => {
    const result = await extractMediaTranscript(new File(['x'], 'notes.pdf', { type: 'application/pdf' }));
    expect(result).toBeNull();
  });
});
