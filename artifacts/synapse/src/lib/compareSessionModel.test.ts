import { describe, expect, it } from 'vitest';
import { buildCompareSessionContent, filterCompareRows } from './compareSessionModel';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Η Αγγλία παράγει ύφασμα ενώ η Πορτογαλία παράγει κρασί.
| Διάσταση | Αγγλία | Πορτογαλία |
| --- | --- | --- |
| Εξαγωγές | ύφασμα | κρασί |
`.trim();

describe('compareSessionModel', () => {
  it('marks passage-grounded rows for generic Introduction concept', () => {
    const session = buildCompareSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      glossary: [],
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
      lang: 'en',
    });

    expect(session.rows.length).toBeGreaterThan(0);
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('names comparison columns after a grounded structured table (never "A"/"B")', () => {
    const session = buildCompareSessionContent({
      concept: 'Εμπόριο',
      text: GREEK_ECON_PASSAGE,
      glossary: [
        { term: 'Εμπόριο', definition: 'Διεθνές εμπόριο', source: 'notes', relatedConcepts: [], courseId: 'c1' },
        { term: 'Εξαγωγές', definition: 'Πωλήσεις στο εξωτερικό', source: 'notes', relatedConcepts: [], courseId: 'c1' },
      ],
      hasSource: true,
      lang: 'el',
    });

    expect(session.headers).toEqual(['Διάσταση', 'Αγγλία', 'Πορτογαλία']);
    expect(session.headers.slice(1)).not.toContain('Α');
    expect(session.headers.slice(1)).not.toContain('Β');
  });

  it('falls back to honest neutral labels when no structured table exists', () => {
    const session = buildCompareSessionContent({
      concept: 'Εμπόριο',
      text: 'Η Αγγλία παράγει ύφασμα ενώ η Πορτογαλία παράγει κρασί.',
      glossary: [
        { term: 'Αγγλία', definition: 'Παράγει ύφασμα', source: 'notes', relatedConcepts: [], courseId: 'c1' },
        { term: 'Πορτογαλία', definition: 'Παράγει κρασί', source: 'notes', relatedConcepts: [], courseId: 'c1' },
      ],
      hasSource: true,
      lang: 'el',
    });

    expect(session.headers).toEqual(['Διάσταση', 'Στοιχείο 1', 'Στοιχείο 2']);
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildCompareSessionContent({
      concept: 'Elasticity',
      text: '',
      glossary: [],
      hasSource: false,
      lang: 'en',
    });

    expect(session.rows).toEqual([]);
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
  });

  it('filters rows by query across all columns', () => {
    const rows: [string, string, string][] = [
      ['Exports', 'cloth', 'wine'],
      ['Labor', '100 units', '80 units'],
    ];

    expect(filterCompareRows(rows, 'cloth')).toEqual([['Exports', 'cloth', 'wine']]);
    expect(filterCompareRows(rows, 'units')).toHaveLength(1);
    expect(filterCompareRows(rows, '')).toEqual(rows);
  });
});
