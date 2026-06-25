import { describe, expect, it } from 'vitest';
import {
  repairSpacedGreekLine,
  repairSpacedGreekText,
  repairGluedGreekLine,
  repairGreekDocumentText,
  segmentGluedGreekBlob,
} from './greekTextRepair';
import {
  EXPECTED_REPAIRS,
  GLUED_ARTICLE_PRODUCTION,
  GLUED_INCOME_TITLE,
  GLUED_PARTICLE_FOREIGN,
  GLUED_TWO_SPACES_LECTURE,
  SPACED_ABSOLUTE_ADVANTAGE,
  SPACED_COMPETITION,
  SPACED_INCOME_DISTRIBUTION,
  SPACED_PRODUCTION_INCOME,
  SPACED_TWO_SPACES_TITLE,
} from './greekOcrFixtures';

const NORMAL_GREEK =
  'Η αναγκαία ποσότητα εργασίας ανά μονάδα προϊόντος καθορίζει την προσφορά.';

describe('greekTextRepair', () => {
  it('joins heavily spaced Greek body text from PDF screenshots', () => {
    const fixed = repairSpacedGreekLine(SPACED_COMPETITION);
    expect(fixed).not.toMatch(/α ν τ α/);
    expect(fixed.toLowerCase()).toContain('ανταγων');
    expect(fixed).toContain('εργαζόμενους');
  });

  it('joins all-caps spaced lecture titles', () => {
    const fixed = repairSpacedGreekLine(SPACED_TWO_SPACES_TITLE);
    expect(fixed).not.toMatch(/Δ Υ Ο/);
    expect(fixed).toContain('ΔΥΟ');
    expect(fixed).toContain('ΧΩΡΕΣ');
    expect(fixed).toContain('ημεδαπή');
  });

  it('does not destroy normal Greek prose', () => {
    expect(repairSpacedGreekLine(NORMAL_GREEK)).toBe(NORMAL_GREEK);
  });

  it('does not join FAQ or English Q/A lines', () => {
    const faq = 'Q: What is supply?';
    const answer = 'A: Quantity producers offer at each price.';
    expect(repairSpacedGreekLine(faq)).toBe(faq);
    expect(repairSpacedGreekLine(answer)).toBe(answer);
  });

  it('repairs multi-line bodies', () => {
    const body = [SPACED_COMPETITION, NORMAL_GREEK, SPACED_TWO_SPACES_TITLE].join('\n');
    const out = repairSpacedGreekText(body);
    expect(out.split('\n')[0]).not.toMatch(/α ν τ α/);
    expect(out.split('\n')[1]).toBe(NORMAL_GREEK);
  });

  it('splits OCR-glued Greek from lecture PDF reader (screenshot fixture)', () => {
    const fixed = repairGluedGreekLine(GLUED_TWO_SPACES_LECTURE);
    expect(fixed).toContain('6. Δύο χώρες');
    expect(fixed).toContain('Η ημεδαπή');
    expect(fixed).toContain('και');
    expect(fixed).toMatch(/Αλλοδαπή/);
    expect(fixed).not.toContain('Δύοχώρες');
    expect(fixed).not.toContain('Ηημεδαπή');
  });

  it('runs spaced then glued repair in repairGreekDocumentText', () => {
    const body = [SPACED_TWO_SPACES_TITLE, GLUED_TWO_SPACES_LECTURE].join('\n');
    const out = repairGreekDocumentText(body);
    expect(out.split('\n')[0]).toContain('ΔΥΟ');
    expect(out.split('\n')[0]).toContain('ΧΩΡΕΣ');
    expect(out.split('\n')[1]).toContain('Δύο χώρες');
    expect(out.split('\n')[1]).toContain('Η ημεδαπή');
  });
});

describe('greekTextRepair v2.3 — ΕΚΠΑ PDF fixtures', () => {
  it.each(EXPECTED_REPAIRS)('repairs: $input', ({ input, mustContain, mustNotContain }) => {
    const out = repairGreekDocumentText(input);
    for (const phrase of mustContain) {
      expect(out, `expected "${phrase}" in "${out}"`).toContain(phrase);
    }
    for (const bad of mustNotContain ?? []) {
      expect(out, `unexpected "${bad}"`).not.toContain(bad);
    }
  });

  it('segments lexicon-glued title words', () => {
    expect(segmentGluedGreekBlob(GLUED_INCOME_TITLE)).toBe('Διανομή εισοδήματος');
  });

  it('repairs syllabus spaced lecture 2 (e2e fixture)', () => {
    const out = repairGreekDocumentText(SPACED_ABSOLUTE_ADVANTAGE);
    expect(out).toBe('Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.');
  });

  it('repairs income distribution spaced headings', () => {
    expect(repairGreekDocumentText(SPACED_INCOME_DISTRIBUTION)).toBe('Διανομή εισοδήματος');
    expect(repairGreekDocumentText(SPACED_PRODUCTION_INCOME)).toBe('παραγωγής εισοδήματος');
  });

  it('splits glued particles and articles', () => {
    expect(repairGluedGreekLine(GLUED_PARTICLE_FOREIGN)).toBe('και Αλλοδαπή');
    expect(repairGluedGreekLine(GLUED_ARTICLE_PRODUCTION)).toBe('την παραγωγή');
  });
});
