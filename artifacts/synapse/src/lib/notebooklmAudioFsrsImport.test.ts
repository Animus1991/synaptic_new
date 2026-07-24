import { describe, it, expect } from 'vitest';
import { audioSegmentsToQuizCards, buildAudioFsrsImportResult } from './notebooklmAudioFsrsImport';

describe('notebooklmAudioFsrsImport', () => {
  it('maps audio segments to quiz-style FSRS cards', () => {
    const cards = audioSegmentsToQuizCards([
      { index: 0, title: 'Intro', startSec: 0, text: 'Welcome to the overview of elasticity.' },
      { index: 1, title: 'Deep dive', startSec: 90, text: 'Price elasticity measures responsiveness.' },
    ]);
    expect(cards).toHaveLength(2);
    expect(cards[0]!.front).toContain('Intro');
    expect(cards[0]!.front).toContain('[0:00]');
    expect(cards[1]!.back).toContain('Price elasticity');
  });

  it('builds import result for FSRS pipeline', () => {
    const result = buildAudioFsrsImportResult('Lecture 3', [
      { index: 0, title: 'Part 1', startSec: null, text: 'Enough text for a card here.' },
    ]);
    expect(result.kind).toBe('audio-transcript');
    expect(result.quizCards).toHaveLength(1);
    expect(result.title).toBe('Lecture 3');
  });
});
