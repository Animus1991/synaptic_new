import { describe, expect, it } from 'vitest';
import { collapsePageSections, isLectureSection } from './sectionMerger';
import type { DocumentSection } from './textSegmentation';

function pageSection(body: string, heading?: string): DocumentSection {
  return { heading, text: body, boundaryKind: 'page' };
}

describe('sectionMerger', () => {
  it('merges page-only sections into lecture units', () => {
    const sections: DocumentSection[] = [
      pageSection('ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ\nΔΙΕΘΝΗΣ ΟΙΚΟΝΟΜΙΚΗ'),
      pageSection('ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ\nΘεματική: εμπορική πολιτική.'),
      pageSection('Συνέχεια διάλεξης 1 με παραδείγματα.'),
      pageSection('ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ\nΑπόλυτα πλεονεκτήματα.'),
      pageSection('Συνέχεια διάλεξης 2.'),
      ...Array.from({ length: 8 }, (_, i) => pageSection(`Σελίδα filler ${i + 3}`)),
    ];

    const merged = collapsePageSections(sections);
    expect(merged.length).toBeLessThan(sections.length);
    expect(merged.some((s) => isLectureSection(s) && /ΔΙΑΛΕΞΗ 1/i.test(s.heading ?? ''))).toBe(true);
    expect(merged.some((s) => /Συνέχεια διάλεξης 1/.test(s.text))).toBe(true);
  });

  it('leaves non-page documents unchanged', () => {
    const sections: DocumentSection[] = [
      { heading: 'Supply', text: 'Supply rises when price rises.', boundaryKind: 'heading' },
      { heading: 'Demand', text: 'Demand falls when price rises.', boundaryKind: 'heading' },
    ];
    expect(collapsePageSections(sections)).toEqual(sections);
  });
});
