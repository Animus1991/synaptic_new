import { describe, expect, it } from 'vitest';
import { buildReprocessPreview, extractReaderPreviewSnippet } from './reprocessPreview';
import type { Course, UploadedFile } from '../types';

const course: Course = {
  id: 'c-preview',
  title: 'Διεθνής Οικονομική',
  description: 'Test',
  subject: 'Economics',
  color: '#818cf8',
  icon: '📚',
  totalLessons: 6,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [{
    id: 't1',
    title: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ',
    description: '',
    keyConcepts: [],
    conceptCount: 2,
    lessons: [],
    mastery: 0,
    prerequisites: [],
    order: 0,
    retentionPrediction: 0,
    isLocked: false,
    estimatedMinutes: 30,
  }],
  createdAt: '2026-01-01',
  estimatedHours: 4,
  sourceFiles: ['syllabus.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 4,
  glossaryCount: 2,
  exerciseCount: 3,
  sourceQuality: { score: 37, band: 'weak', needsMoreMaterial: true, warnings: [], strengths: [], nextActions: [], recommendedTopicCount: 4, detectedTopicCount: 2, finalTopicCount: 2, outlineAdjusted: false, metrics: { wordCount: 200, sectionCount: 1, definitionCount: 0, glossaryCount: 0, keyphraseCount: 3, workedExampleCount: 0, formulaCount: 0, comparisonCount: 0, averageConceptsPerTopic: 1 } },
  pipelineMeta: { version: '2.0.0', generatedAt: '2026-01-01', outlineSource: 'lexical' },
};

const gluedBefore = `
ΔΙΑΛΕΞΗ1ΕΙΣΑΓΩΓΗΣΤΗΔΙΕΘΝΗΟΙΚΟΝΟΜΙΚΗ
+10+OK+20+QY1800 w/w* trade theory
Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.

ΔΙΑΛΕΞΗ2ΘΕΩΡΙΑΣΥΓΚΡΙΤΙΚΩΝΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.
`.trim();

const cleanAfterShape = `
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ
Θεματική: εμπορική πολιτική.

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Απόλυτα πλεονεκτήματα.
`.trim();

const file: UploadedFile = {
  id: 'f-1',
  name: 'syllabus.pdf',
  type: 'pdf',
  size: 1200,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c-preview',
  extractedText: gluedBefore,
  pipelineVersion: '2.0.0',
};

describe.sequential('reprocessPreview', () => {
  it('extractReaderPreviewSnippet prefers lecture headings', () => {
    const snippet = extractReaderPreviewSnippet(cleanAfterShape);
    expect(snippet).toMatch(/ΔΙΑΛΕΞΗ/i);
  });

  it('buildReprocessPreview exposes before/after snippets and step titles', { timeout: 30_000 }, () => {
    const preview = buildReprocessPreview(course, [file], 'el');
    expect(preview).not.toBeNull();
    expect(preview!.beforeScore).toBe(37);
    expect(preview!.afterScore).toBeGreaterThanOrEqual(preview!.beforeScore);
    expect(preview!.beforeSnippet.length).toBeGreaterThan(0);
    expect(preview!.afterSnippet.length).toBeGreaterThan(0);
    expect(preview!.afterStepTitles.length).toBeGreaterThan(0);
    expect(preview!.hasMaterialChanges).toBe(true);
    expect(preview!.beforeSnippet).not.toBe(preview!.afterSnippet);
  });

  it('returns null when no stored text', () => {
    expect(buildReprocessPreview(course, [{ ...file, extractedText: '', courseId: 'c-preview' }], 'el')).toBeNull();
  });
});
