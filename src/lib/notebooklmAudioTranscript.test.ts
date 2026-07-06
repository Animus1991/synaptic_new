import { describe, it, expect } from 'vitest';
import {
  formatNotebookLmAudioMarkdown,
  inferNotebookLmAudioTitle,
  isNotebookLmAudioTranscript,
  parseNotebookLmAudioTranscript,
} from './notebooklmAudioTranscript';

describe('notebooklmAudioTranscript', () => {
  it('parses bracket timestamps into segments', () => {
    const raw = `[0:00] Introduction
Welcome to the audio overview of elasticity.

[2:15] Price elasticity
When price changes, quantity demanded responds.`;

    const segments = parseNotebookLmAudioTranscript(raw);
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]!.startSec).toBe(0);
    expect(segments[1]!.startSec).toBe(135);
    expect(segments[0]!.text).toContain('Welcome');
  });

  it('parses dash timestamps', () => {
    const raw = `1:30 - Deep dive
Content for the second chapter.

4:00 - Summary
Wrap-up points.`;

    const segments = parseNotebookLmAudioTranscript(raw);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.title).toContain('Deep dive');
    expect(segments[0]!.startSec).toBe(90);
  });

  it('formats markdown with chapter headers', () => {
    const md = formatNotebookLmAudioMarkdown(
      [
        { index: 0, title: 'Intro', startSec: 0, text: 'Hello listeners.' },
        { index: 1, title: 'Part 2', startSec: 120, text: 'More detail.' },
      ],
      'Economics overview',
    );
    expect(md).toContain('# Economics overview');
    expect(md).toContain('### [0:00] Intro');
    expect(md).toContain('### [2:00] Part 2');
  });

  it('detects audio transcript vs chat', () => {
    const segments = parseNotebookLmAudioTranscript('[0:00] Start\nHello.\n\n[1:00] Next\nWorld.');
    expect(isNotebookLmAudioTranscript('[0:00] Start', segments, { isChat: false })).toBe(true);
    expect(isNotebookLmAudioTranscript('User: Hi\nAssistant: Hello', [], { isChat: true })).toBe(false);
  });

  it('infers title from heading', () => {
    const raw = `# Audio overview\n\n[0:00] Start\nBody.`;
    const segments = parseNotebookLmAudioTranscript(raw);
    expect(inferNotebookLmAudioTitle(raw, segments)).toBe('Audio overview');
  });
});
