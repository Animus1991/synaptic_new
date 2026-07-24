import { describe, expect, it } from 'vitest';
import { auditReaderStepSyncP104 } from './readerStepSyncP104QA';

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

describe.sequential('readerStepSyncP104QA (Wave 7 / SW-P1-04)', () => {
  it('passes when reader sections and lesson steps bidirectionally sync', { timeout: 30_000 }, () => {
    const report = auditReaderStepSyncP104({
      lang: 'en',
      steps,
      sourceText: syllabusText,
      currentStep: 0,
    });
    expect(report.ok).toBe(true);
    expect(report.linkedStepCount).toBeGreaterThan(0);
    expect(report.readerNavResolvable).toBeGreaterThan(0);
    expect(report.bannerSummary).toMatch(/linked/i);
  });

  it('flags missing source', () => {
    const report = auditReaderStepSyncP104({ lang: 'el', steps, sourceText: '' });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === 'no-source')).toBe(true);
  });
});
