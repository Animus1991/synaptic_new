import { describe, expect, it } from 'vitest';
import {
  buildWhiteboardSessionContent,
  filterWhiteboardFormulas,
} from './whiteboardSessionModel';
import type { ExtractedFormula } from './noteContentExtractors';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα.
P = MC και Q = f(P) για την ισορροπία της αγοράς.
`.trim();

describe('whiteboardSessionModel', () => {
  it('builds passage-grounded session for generic Introduction concept', () => {
    const session = buildWhiteboardSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      lang: 'en',
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.hasReferenceContent).toBe(true);
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.referenceExcerpt.length).toBeGreaterThan(20);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildWhiteboardSessionContent({
      concept: 'Elasticity',
      text: '',
      lang: 'en',
      hasSource: false,
    });

    expect(session.formulas).toEqual([]);
    expect(session.hasReferenceContent).toBe(false);
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
  });

  it('filters formulas by name and expression', () => {
    const formulas: ExtractedFormula[] = [
      { id: 'f1', name: 'Market equilibrium', formula: 'P = MC' },
      { id: 'f2', name: 'Demand curve', formula: 'Q = a - bP' },
    ];

    expect(filterWhiteboardFormulas(formulas, 'demand')).toHaveLength(1);
    expect(filterWhiteboardFormulas(formulas, 'MC')).toHaveLength(1);
    expect(filterWhiteboardFormulas(formulas, '')).toEqual(formulas);
  });

  it('falls back to pre-extracted formulas when live extraction is empty', () => {
    const preExtracted: ExtractedFormula[] = [
      { id: 'f1', name: 'Demand law', formula: 'Qd = f(P)' },
    ];
    const session = buildWhiteboardSessionContent({
      concept: 'Elasticity',
      text: 'No inline formulas in this excerpt.',
      lang: 'en',
      hasSource: true,
      preExtractedFormulas: preExtracted,
    });

    expect(session.formulas).toEqual(preExtracted);
    expect(session.weakExtraction).toBe(false);
    expect(session.hasReferenceContent).toBe(true);
  });
});
