import { describe, expect, it } from 'vitest';
import { buildReaderSegments } from './readerDocumentLayout';
import { normalizeDocumentText } from './textSegmentation';
import {
  isWorkspaceQuizStep,
  resolveReaderSegmentForWorkspaceStep,
  resolveWorkspaceStepForReaderLabel,
} from './readerStepSync';

describe('readerStepSync', () => {
  const syllabusText = [
    'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
    'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
    'Θεματική: εμπορική πολιτική.',
  ].join('\f') + '\f' + [
    'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ',
    'Απόλυτα πλεονεκτήματα.',
  ].join('\n');

  const steps = [
    { title: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ', type: 'Core Concept' },
    { title: 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ', type: 'Deep Dive' },
    { title: 'Knowledge Check', type: 'Quiz' },
  ];

  it('detects quiz steps', () => {
    expect(isWorkspaceQuizStep(steps[2]!)).toBe(true);
    expect(isWorkspaceQuizStep(steps[0]!)).toBe(false);
  });

  it('maps lesson steps to reader segments via source-text anchor', () => {
    const segments = buildReaderSegments(syllabusText);
    const seg0 = resolveReaderSegmentForWorkspaceStep(0, steps, segments, syllabusText);
    const seg1 = resolveReaderSegmentForWorkspaceStep(1, steps, segments, syllabusText);
    expect(seg0).not.toBeNull();
    expect(seg1).not.toBeNull();
    expect(seg0).not.toBe(seg1);
    expect(
      segments[seg0!]?.content.includes('ΔΙΑΛΕΞΗ 1')
      || segments[seg0!]?.content.includes('Θεματική')
      || normalizeDocumentText(syllabusText).includes('ΔΙΑΛΕΞΗ 1'),
    ).toBe(true);
    expect(segments[seg1!]?.content).toMatch(/ΔΙΑΛΕΞΗ 2/i);
    expect(resolveReaderSegmentForWorkspaceStep(2, steps, segments, syllabusText)).toBeNull();
  });

  it('aligns by ordinal when step titles are generic', () => {
    const segments = buildReaderSegments(syllabusText);
    const genericSteps = [
      { title: 'Introduction', type: 'Core Concept' },
      { title: 'Τέλος διάλεξης', type: 'Deep Dive' },
      { title: 'Έλεγχος Γνώσεων', type: 'Κουίζ' },
    ];
    const seg0 = resolveReaderSegmentForWorkspaceStep(0, genericSteps, segments, syllabusText);
    const seg1 = resolveReaderSegmentForWorkspaceStep(1, genericSteps, segments, syllabusText);
    expect(seg0).not.toBeNull();
    expect(seg1).not.toBeNull();
    expect(seg0).not.toBe(seg1);
  });

  it('maps reader nav label back to workspace step index', () => {
    const segments = buildReaderSegments(syllabusText);
    expect(resolveWorkspaceStepForReaderLabel('ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, segments, syllabusText)).toBe(1);
    expect(resolveWorkspaceStepForReaderLabel('ΔΙΑΛΕΞΗ 1', genericStepsFromSyllabus(), segments, syllabusText)).toBe(0);
  });
});

function genericStepsFromSyllabus() {
  return [
    { title: 'Introduction', type: 'Core Concept' },
    { title: 'Τέλος διάλεξης', type: 'Deep Dive' },
    { title: 'Έλεγχος Γνώσεων', type: 'Κουίζ' },
  ];
}
