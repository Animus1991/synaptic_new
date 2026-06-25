import { describe, expect, it } from 'vitest';
import {
  filterLeitnerCardsByConfidence,
  filterQuizSessionItems,
  isSuspiciousStudyFragment,
} from './confidenceGating';
import type { QuizSessionItem } from './quizSession';
import { findSuspiciousReaderSegments } from './readerSuspiciousFragments';

describe('confidenceGating', () => {
  it('flags OCR formula garbage', () => {
    expect(isSuspiciousStudyFragment('=10*QK+20*QY1800')).toBe(true);
    expect(isSuspiciousStudyFragment('Comparative advantage')).toBe(false);
  });

  it('filters garbage quiz items', () => {
    const items: QuizSessionItem[] = [
      { id: '1', quiz: { kind: 'short-answer', question: '=10*QK+20', acceptedAnswers: ['x'], hint: '' } },
      { id: '2', quiz: { kind: 'short-answer', question: 'What is a tariff?', acceptedAnswers: ['tax'], hint: '' } },
    ];
    const filtered = filterQuizSessionItems(items);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });

  it('filters garbage leitner cards', () => {
    const cards = filterLeitnerCardsByConfidence([
      { front: '+10+OK+20', back: 'noise' },
      { front: 'Elasticity', back: 'Responsiveness of quantity to price.' },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.front).toBe('Elasticity');
  });

  it('finds suspicious reader headings', () => {
    const text = '# Trade theory\n\nGood paragraph.\n\n# =10*QK+20*QY\n\nMore text.';
    const suspicious = findSuspiciousReaderSegments(text);
    expect(suspicious.length).toBeGreaterThanOrEqual(1);
    expect(suspicious.some((s) => s.label.includes('QK'))).toBe(true);
  });
});
