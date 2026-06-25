import { describe, expect, it } from 'vitest';
import {
  buildFallbackMcQuiz,
  buildFallbackQuizSession,
  buildFallbackComparisons,
  buildFallbackDebateTree,
  buildFallbackFeynmanOutline,
  isGenericStudyConcept,
} from './workspaceContentFallback';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα μεταξύ δύο χωρών.
Η Αγγλία παράγει ύφασμα και κρασί· η Πορτογαλία έχει χαμηλότερο κόστος στο κρασί.
`.trim();

describe('workspaceContentFallback', () => {
  it('detects generic study concepts', () => {
    expect(isGenericStudyConcept('Introduction')).toBe(true);
    expect(isGenericStudyConcept('Comparative advantage')).toBe(false);
  });

  it('builds MC quiz from passage without glossary', () => {
    const quiz = buildFallbackMcQuiz(GREEK_ECON_PASSAGE, 'Introduction', 'en');
    expect(quiz).not.toBeNull();
    if (quiz && (!quiz.kind || quiz.kind === 'mc')) {
      expect(quiz.options.length).toBe(4);
      expect(quiz.correctIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('builds a multi-question fallback session', () => {
    const items = buildFallbackQuizSession(GREEK_ECON_PASSAGE, 'Introduction', [], 'en', 3);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('builds comparison rows from section-like content', () => {
    const text = `ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ\nΕμπόριο και εξαγωγές.\n\nΔΙΑΛΕΞΗ 2 RICARDO\nΣυγκριτικά πλεονεκτήματα.`;
    const rows = buildFallbackComparisons(text, 'Introduction');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('builds debate tree from substantive sentences', () => {
    const tree = buildFallbackDebateTree(GREEK_ECON_PASSAGE, 'Introduction');
    expect(tree).not.toBeNull();
    expect(tree!.type).toBe('claim');
  });

  it('builds passage-grounded Feynman outline for generic concepts', () => {
    const outline = buildFallbackFeynmanOutline(
      GREEK_ECON_PASSAGE,
      'Introduction',
      'Ricardo lecture',
      'en',
    );
    expect(outline.length).toBeGreaterThan(2);
    expect(outline.some((line) => line.includes('Ricardo') || line.includes('plain language'))).toBe(true);
    expect(outline.some((line) => line.includes('Find The Quantities'))).toBe(false);
  });
});
