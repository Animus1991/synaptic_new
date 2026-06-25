import { describe, expect, it } from 'vitest';
import { buildReaderSegments } from './readerDocumentLayout';
import {
  buildReaderSectionNavFromSegments,
  sectionNavRailLabel,
  selectStructureNavSections,
  shouldSkipNavHeading,
} from './readerSectionNav';
import { analyzeDocumentStructure } from './documentStructureReport';

describe('readerSectionNav', () => {
  it('skips generic §N and Introduction headings', () => {
    expect(shouldSkipNavHeading('Introduction')).toBe(true);
    expect(shouldSkipNavHeading('§2')).toBe(true);
    expect(shouldSkipNavHeading('ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ')).toBe(false);
  });

  it('builds lecture-only nav from merged syllabus segments', () => {
    const page1 = 'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ\nΔΙΕΘΝΗΣ ΟΙΚΟΝΟΜΙΚΗ';
    const page2 = 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ\nΘεματική: εμπορική πολιτική.';
    const page3 = 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ\nΑπόλυτα πλεονεκτήματα.';
    const text = `${page1}\f${page2}\f${page3}`;

    const segments = buildReaderSegments(text);
    const nav = buildReaderSectionNavFromSegments(segments);

    expect(nav.length).toBeGreaterThanOrEqual(2);
    expect(nav.every((n) => /ΔΙΑΛΕΞΗ/i.test(n.label))).toBe(true);
    expect(nav.every((n) => !/§\d+/.test(n.label))).toBe(true);
    expect(sectionNavRailLabel(nav, 'el')).toBe('Διαλέξεις');
  });

  it('filters structure report sections to lectures when present', () => {
    const page1 = 'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ';
    const page2 = 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ\nΘεματική.';
    const page3 = 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ\nΑπόλυτα.';
    const text = `${page1}\f${page2}\f${page3}`;

    const structure = analyzeDocumentStructure(text, 'el');
    expect(structure.sections.length).toBeGreaterThanOrEqual(2);
    expect(structure.sections.every((s) => /ΔΙΑΛΕΞΗ/i.test(s.heading ?? ''))).toBe(true);
  });

  it('falls back to meaningful headings when no lectures detected', () => {
    const sections = [
      { heading: 'Supply', preview: 'Supply rises when price rises.' },
      { heading: 'Demand', preview: 'Demand falls when price rises.' },
      { heading: 'Introduction', preview: 'Overview of the chapter.' },
    ];
    const nav = selectStructureNavSections(sections);
    expect(nav.map((s) => s.heading)).toEqual(['Supply', 'Demand']);
  });
});
