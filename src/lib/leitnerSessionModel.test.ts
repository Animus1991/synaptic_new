import { describe, expect, it } from 'vitest';
import {
  buildLeitnerSessionContent,
  buildSpacingLeitnerCards,
  filterLeitnerCards,
  mergeLeitnerCards,
} from './leitnerSessionModel';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα μεταξύ δύο χωρών.
`.trim();

describe('leitnerSessionModel', () => {
  it('builds passage-grounded session for generic Introduction concept', () => {
    const session = buildLeitnerSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      glossary: [],
      lang: 'en',
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.cards.length).toBeGreaterThan(0);
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildLeitnerSessionContent({
      concept: 'Elasticity',
      text: '',
      glossary: [],
      lang: 'en',
      hasSource: false,
    });

    expect(session.cards).toEqual([]);
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
  });

  it('merges spacing, note, and custom cards without duplicates', () => {
    const merged = mergeLeitnerCards(
      [{ front: 'Trade', back: 'Exchange of goods' }],
      [{ front: 'trade', back: 'duplicate front' }],
      [{ front: 'Exports', back: 'Goods sold abroad' }],
    );
    expect(merged).toHaveLength(2);
    expect(filterLeitnerCards(merged, 'export')).toHaveLength(1);
  });

  it('builds spacing cards matched to concept', () => {
    const cards = buildSpacingLeitnerCards(
      [{
        concept: 'Introduction to trade',
        interval: 3,
        nextReview: '2026-01-01',
        stability: 2,
        difficulty: 0.5,
        reviewCount: 1,
      }],
      'Introduction',
      [],
      'en',
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.back).toContain('3');
  });
});
