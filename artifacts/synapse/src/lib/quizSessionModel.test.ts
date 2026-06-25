import { describe, expect, it } from 'vitest';
import {
  buildQuizSessionContent,
  filterQuizItems,
  quizItemQuestion,
} from './quizSessionModel';
import type { QuizSessionItem } from './quizSession';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα μεταξύ δύο χωρών.
`.trim();

describe('quizSessionModel', () => {
  it('builds passage-grounded session for generic Introduction concept', () => {
    const session = buildQuizSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      glossary: [],
      lang: 'en',
      ability: 0,
      mastery: 50,
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.items.length).toBeGreaterThan(0);
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildQuizSessionContent({
      concept: 'Elasticity',
      text: '',
      glossary: [],
      lang: 'en',
      ability: 0,
      mastery: 50,
      hasSource: false,
    });

    expect(session.items).toEqual([]);
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
  });

  it('filters items by question text', () => {
    const items: QuizSessionItem[] = [
      { id: 'q-0', quiz: { question: 'What is comparative advantage?', options: ['a', 'b'], correctIndex: 0 } },
      { id: 'q-1', quiz: { question: 'Define elasticity of demand', options: ['a', 'b'], correctIndex: 1 } },
    ];

    expect(quizItemQuestion(items[0]!)).toBe('What is comparative advantage?');
    expect(filterQuizItems(items, 'elasticity')).toHaveLength(1);
    expect(filterQuizItems(items, '')).toEqual(items);
  });
});
