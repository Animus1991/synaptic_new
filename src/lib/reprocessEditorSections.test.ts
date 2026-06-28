import { describe, expect, it } from 'vitest';
import {
  buildReprocessEditorSections,
  countManualEdits,
  mergeReprocessSections,
  normalizeSectionText,
} from './reprocessEditorSections';

const before = `
ΔΙΑΛΕΞΗ1ΕΙΣΑΓΩΓΗ
Εισαγωγή στη διεθνή οικονομική.

ΔΙΑΛΕΞΗ2ΘΕΩΡΙΑ
Συγκριτικά πλεονεκτήματα.
`.trim();

const after = `
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ
Εισαγωγή στη διεθνή οικονομική.

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ
Συγκριτικά πλεονεκτήματα.
`.trim();

describe('reprocessEditorSections', () => {
  it('builds aligned sections from before/after text', () => {
    const sections = buildReprocessEditorSections(before, after, 'el');
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].beforeText.length).toBeGreaterThan(0);
    expect(sections[0].pipelineText.length).toBeGreaterThan(0);
  });

  it('mergeReprocessSections round-trips edited content', () => {
    const sections = buildReprocessEditorSections(before, after, 'el');
    sections[0].editedText = 'Custom intro paragraph.';
    const merged = mergeReprocessSections(sections);
    expect(merged).toContain('Custom intro paragraph.');
    expect(countManualEdits(sections)).toBe(1);
  });

  it('normalizeSectionText trims and normalizes', () => {
    expect(normalizeSectionText('  hello   world  ')).toBeTruthy();
  });
});
