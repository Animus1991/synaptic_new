import { describe, expect, it } from 'vitest';
import { collapseRepeatedPhrases, isGarbageStepTitle, sanitizeStepTitle } from './workspaceStepTitleQuality';

describe('workspaceStepTitleQuality', () => {
  it('flags OCR formula noise as garbage', () => {
    expect(isGarbageStepTitle('+10+OK+20+QY1800')).toBe(true);
    expect(isGarbageStepTitle('w/w* 55')).toBe(true);
    expect(isGarbageStepTitle('( α L * )')).toBe(true);
  });

  it('accepts lecture headings and normal labels', () => {
    expect(isGarbageStepTitle('ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ')).toBe(false);
    expect(isGarbageStepTitle('Introduction')).toBe(false);
    expect(isGarbageStepTitle('Comparative advantage')).toBe(false);
  });

  it('sanitizeStepTitle falls back to concept', () => {
    expect(sanitizeStepTitle('+10+OK', 'Διεθνής Οικονομική', 'el')).toBe('Διεθνής Οικονομική');
  });

  it('collapses immediately-repeated word blocks from bad extraction', () => {
    expect(collapseRepeatedPhrases('Αγαθά Αναγκαία ποσότητα Αναγκαία ποσότητα')).toBe('Αγαθά Αναγκαία ποσότητα');
    expect(collapseRepeatedPhrases('Introduction Introduction')).toBe('Introduction');
    expect(collapseRepeatedPhrases('ποσότητα ποσότητα')).toBe('ποσότητα');
    expect(collapseRepeatedPhrases('a b a b')).toBe('a b');
  });

  it('leaves non-duplicated titles untouched', () => {
    expect(collapseRepeatedPhrases('Comparative advantage')).toBe('Comparative advantage');
    expect(collapseRepeatedPhrases('ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ')).toBe('ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ');
  });

  it('sanitizeStepTitle removes duplicated phrase in a real heading', () => {
    expect(sanitizeStepTitle('Αγαθά Αναγκαία ποσότητα Αναγκαία ποσότητα', 'Εισαγωγή', 'el')).toBe(
      'Αγαθά Αναγκαία ποσότητα',
    );
  });
});
