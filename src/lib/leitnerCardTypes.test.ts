import { describe, expect, it } from 'vitest';
import {
  countLeitnerCardsByType,
  inferLeitnerCardType,
  leitnerCardTypeLabel,
  withLeitnerCardType,
} from './leitnerCardTypes';
import { filterLeitnerCardsByType, mergeLeitnerCards } from './leitnerSessionModel';

describe('leitnerCardTypes', () => {
  it('labels card types in EN and EL', () => {
    expect(leitnerCardTypeLabel('mistake', 'en')).toBe('Mistake');
    expect(leitnerCardTypeLabel('formula', 'el')).toBe('Τύπος');
  });

  it('infers mistake from quiz-mistake source', () => {
    expect(inferLeitnerCardType({
      front: 'What is elasticity?',
      back: 'Price sensitivity',
      source: 'quiz-mistake',
    })).toBe('mistake');
  });

  it('infers formula from math-like content', () => {
    expect(inferLeitnerCardType({
      front: 'GDP deflator',
      back: 'Nominal GDP / Real GDP × 100',
    })).toBe('formula');
  });

  it('infers cloze from blank markers', () => {
    expect(inferLeitnerCardType({
      front: 'Trade is based on {{comparative advantage}}',
      back: 'Ricardo model',
    })).toBe('cloze');
  });

  it('infers definition for short term + long back', () => {
    expect(inferLeitnerCardType({
      front: 'Elasticity',
      back: 'Measures how responsive quantity demanded is to a change in price over a given period.',
    })).toBe('definition');
  });

  it('defaults to term', () => {
    expect(inferLeitnerCardType({
      front: 'What is true about exports in this passage?',
      back: 'The country exports beans as part of domestic production.',
    })).toBe('term');
  });

  it('respects explicit cardType', () => {
    expect(inferLeitnerCardType({
      front: 'Elasticity',
      back: 'Price sensitivity',
      cardType: 'cloze',
    })).toBe('cloze');
  });

  it('counts cards by inferred type', () => {
    const counts = countLeitnerCardsByType([
      { front: 'A', back: 'Short', source: 'quiz-mistake' },
      { front: 'B', back: 'Nominal / Real = ratio' },
    ]);
    expect(counts.mistake).toBe(1);
    expect(counts.formula).toBe(1);
  });
});

describe('leitnerSessionModel card types', () => {
  it('merges cardType from newer duplicate front', () => {
    const merged = mergeLeitnerCards(
      [{ front: 'Trade', back: 'Exchange', cardType: 'term' }],
      [{ front: 'trade', back: 'Exchange of goods', cardType: 'definition' }],
    );
    expect(merged).toHaveLength(1);
    expect(withLeitnerCardType(merged[0]!).cardType).toBe('definition');
  });

  it('filters cards by type', () => {
    const cards = mergeLeitnerCards([
      { front: 'Q1', back: 'A1', source: 'quiz-mistake' },
      { front: 'Elasticity', back: 'Measures price responsiveness in markets over time.' },
    ]);
    expect(filterLeitnerCardsByType(cards, 'mistake')).toHaveLength(1);
    expect(filterLeitnerCardsByType(cards, 'all')).toHaveLength(2);
  });
});
