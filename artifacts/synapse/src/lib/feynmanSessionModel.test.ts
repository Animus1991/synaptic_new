import { describe, expect, it } from 'vitest';
import { buildFeynmanSessionContent } from './feynmanSessionModel';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα μεταξύ δύο χωρών.
Η Αγγλία παράγει ύφασμα και κρασί· η Πορτογαλία έχει χαμηλότερο κόστος στο κρασί.
`.trim();

describe('feynmanSessionModel', () => {
  it('uses passage-grounded outline for generic Introduction concept', () => {
    const session = buildFeynmanSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      lang: 'en',
      topic: {
        id: 't1',
        title: 'Introduction',
        description: '',
        lessons: [],
        mastery: 0,
        prerequisites: [],
        order: 0,
        isLocked: false,
        estimatedMinutes: 10,
        conceptCount: 2,
        retentionPrediction: 0,
        objectives: [
          'Explain why Find The Quantities matters in this topic.',
          'Compare New Trade Structure with Start of International Trade.',
        ],
      },
      glossary: [],
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.weakExtraction).toBe(true);
    expect(session.outline.some((line) => line.includes('Ricardo') || line.includes('Section'))).toBe(true);
    expect(session.outline.some((line) => line.includes('Find The Quantities'))).toBe(false);
    expect(session.referenceExcerpt.length).toBeGreaterThan(20);
  });

  it('keeps topic objectives when concept matches topic strongly', () => {
    const objectives = ['Explain comparative advantage in your own words.'];
    const session = buildFeynmanSessionContent({
      concept: 'Comparative advantage',
      text: GREEK_ECON_PASSAGE,
      lang: 'en',
      topic: {
        id: 't2',
        title: 'Comparative advantage',
        description: '',
        lessons: [],
        mastery: 0,
        prerequisites: [],
        order: 1,
        isLocked: false,
        estimatedMinutes: 10,
        conceptCount: 1,
        retentionPrediction: 0,
        objectives,
      },
      glossary: [{ term: 'Comparative advantage', definition: 'Trade based on opportunity cost', source: 'notes', relatedConcepts: [], courseId: 'c1' }],
      hasSource: true,
    });

    expect(session.weakExtraction).toBe(false);
    expect(session.outline).toEqual(objectives);
    expect(session.keyTerms[0]?.term).toBe('Comparative advantage');
  });

  it('returns empty-source session when no material uploaded', () => {
    const session = buildFeynmanSessionContent({
      concept: 'Elasticity',
      text: '',
      lang: 'en',
      glossary: [],
      hasSource: false,
    });
    expect(session.weakExtraction).toBe(true);
    expect(session.outline[0]).toContain('Upload');
  });
});
