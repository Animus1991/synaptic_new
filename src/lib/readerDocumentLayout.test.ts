import { describe, it, expect } from 'vitest';
import {
  buildReaderSegments,
  splitSectionBodyIntoParagraphs,
  detectEnumeratedItems,
} from './readerDocumentLayout';

describe('splitSectionBodyIntoParagraphs', () => {
  it('groups PDF single-newline lines into paragraphs', () => {
    const body = [
      'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
      'Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.',
      'Βιβλίο: Krugman, Obstfeld, Melitz.',
    ].join('\n');
    const paras = splitSectionBodyIntoParagraphs(body);
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });

  it('joins wrapped (continuation) lines into a single paragraph', () => {
    const body = [
      'The marginal cost of production rises as output increases because firms must',
      'employ progressively less efficient inputs at the margin.',
    ].join('\n');
    const paras = splitSectionBodyIntoParagraphs(body);
    expect(paras).toHaveLength(1);
    expect(paras[0]).toContain('firms must employ progressively');
  });

  it('keeps distinct sentences that each end in punctuation separate', () => {
    const body = [
      'The marginal cost rises as output increases past the efficient scale point.',
      'Demand falls when prices rise sharply across many market segments at once.',
    ].join('\n');
    const paras = splitSectionBodyIntoParagraphs(body);
    expect(paras).toHaveLength(2);
  });
});

describe('detectEnumeratedItems', () => {
  it('detects a 1..k enumerated run and preserves item text', () => {
    const body = [
      '1 ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
      '2 E-class Μαθήματος: https://eclass.uoa.gr/courses/ECON196',
      '3 E-mail Επικοινωνίας: nstoupo@econ.uoa.gr',
      '4 Ώρες Διδασκαλίας: Δευτέρα 12:00 - 15:00',
    ].join('\n');
    const items = detectEnumeratedItems(body);
    expect(items).not.toBeNull();
    expect(items).toHaveLength(4);
    expect(items![0]).toContain('ΕΘΝΙΚΟ');

    const multiline = [
      '1 ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
      'ΤΜΗΜΑ ΟΙΚΟΝΟΜΙΚΩΝ ΕΠΙΣΤΗΜΩΝ',
      '2 E-class Μαθήματος: https://eclass.uoa.gr/courses/ECON196',
      '3 E-mail Επικοινωνίας: nstoupo@econ.uoa.gr',
    ].join('\n');
    const multiItems = detectEnumeratedItems(multiline);
    expect(multiItems).not.toBeNull();
    expect(multiItems![0]).toContain('\n');

    const segs = buildReaderSegments(body);
    const list = segs.find((s) => s.kind === 'list');
    expect(list).toBeDefined();
    expect(list!.listItems!.length).toBe(4);
  });

  it('does not mistake lines starting with 4-digit years for a list', () => {
    const body = [
      '1929 brought the great depression and a devastating stock market crash.',
      '2008 brought a global financial crisis from the mortgage market collapse.',
      '2020 brought a pandemic that disrupted global supply chains everywhere.',
    ].join('\n');
    expect(detectEnumeratedItems(body)).toBeNull();
  });

  it('does not treat a non-sequential number run as a list', () => {
    const body = [
      '1 first principle of thermodynamics governs energy conservation.',
      '7 random unrelated clause that breaks the increasing sequence here.',
      '92 another non-consecutive numbered fragment appears on this line.',
    ].join('\n');
    expect(detectEnumeratedItems(body)).toBeNull();
  });
});

describe('buildReaderSegments', () => {
  it('emits section headings and paragraphs for PDF page breaks', () => {
    const page1 = 'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ\nΔΙΕΘΝΗΣ ΟΙΚΟΝΟΜΙΚΗ';
    const page2 = 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ\nΘεματική: εμπορική πολιτική.';
    const text = `${page1}\f${page2}`;

    const segments = buildReaderSegments(text);
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments.some((s) => s.content.includes('ΔΙΑΛΕΞΗ 1'))).toBe(true);
    expect(segments.every((s) => !/page break/i.test(s.content))).toBe(true);
  });
});
