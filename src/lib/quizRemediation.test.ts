import { describe, it, expect } from 'vitest';
import type { QuizSessionItem } from './quizSession';
import {
  buildQuizMistakeFlashcard,
  buildQuizMistakeFeynmanPrompt,
  buildQuizWrongClusterFeynmanPrompt,
  quizCorrectAnswerText,
} from './quizRemediation';

describe('quizRemediation', () => {
  const mcItem: QuizSessionItem = {
    id: 'q1',
    quiz: {
      kind: 'mc',
      question: 'What is elasticity?',
      options: ['Price sensitivity', 'Supply curve', 'Demand shift'],
      correctIndex: 0,
    },
  };

  it('extracts MC correct answer', () => {
    expect(quizCorrectAnswerText(mcItem.quiz, 'fallback')).toBe('Price sensitivity');
  });

  it('builds mistake flashcard from wrong MC item', () => {
    const card = buildQuizMistakeFlashcard(mcItem, 'Elasticity');
    expect(card.cardType).toBe('mistake');
    expect(card.front).toContain('elasticity');
    expect(card.back).toBe('Price sensitivity');
  });

  it('builds bilingual Feynman prompts', () => {
    const en = buildQuizMistakeFeynmanPrompt(mcItem, 'Elasticity', 'en');
    expect(en).toContain('Price sensitivity');
    const el = buildQuizMistakeFeynmanPrompt(mcItem, 'Elasticity', 'el');
    expect(el).toContain('Feynman');
  });

  it('builds cluster Feynman prompt for multiple wrong items', () => {
    const en = buildQuizWrongClusterFeynmanPrompt([mcItem, mcItem], 'Elasticity', 'en');
    expect(en).toContain('2 questions');
    expect(en).toContain('Price sensitivity');
  });
});
