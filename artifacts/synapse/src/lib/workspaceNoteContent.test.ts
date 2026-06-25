import { describe, expect, it } from 'vitest';
import type { Course, GlossaryEntry, UploadedFile } from '../types';
import { buildWorkspaceNoteBundle } from './workspaceNoteContent';

const mkGlossary = (term: string, definition: string, courseId = 'c1'): GlossaryEntry => ({
  term,
  definition,
  source: 'test',
  relatedConcepts: [],
  courseId,
});

const mkFile = (text: string, courseId = 'c1'): UploadedFile => ({
  id: 'file-1',
  name: 'notes.md',
  type: 'md',
  size: text.length,
  uploadedAt: '2026-06-21T10:00:00.000Z',
  status: 'analyzed',
  progress: 100,
  courseId,
  extractedText: text,
});

const mkCourse = (courseId = 'c1'): Course => ({
  id: courseId,
  title: 'Elasticity Mastery',
  description: 'Generated from uploaded notes.',
  subject: 'Economics',
  color: '#22d3ee',
  icon: 'book',
  totalLessons: 8,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [
    {
      id: 't1',
      title: 'Elasticity',
      description: 'How responsive quantity is to price changes.',
      lessons: [],
      mastery: 0,
      prerequisites: [],
      order: 1,
      isLocked: false,
      estimatedMinutes: 25,
      conceptCount: 4,
      retentionPrediction: 0,
      keyConcepts: ['Price elasticity of demand', 'Elastic demand', 'Inelastic demand'],
      objectives: [
        'Explain price elasticity of demand.',
        'Apply the elasticity formula to a worked example.',
      ],
    },
    {
      id: 't2',
      title: 'Demand',
      description: 'Demand curves and responsiveness.',
      lessons: [],
      mastery: 0,
      prerequisites: ['t1'],
      order: 2,
      isLocked: false,
      estimatedMinutes: 20,
      conceptCount: 3,
      retentionPrediction: 0,
      keyConcepts: ['Demand curve', 'Quantity demanded'],
    },
  ],
  createdAt: '2026-06-21',
  estimatedHours: 4,
  sourceFiles: ['notes.md'],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 7,
  glossaryCount: 3,
  exerciseCount: 5,
});

describe('buildWorkspaceNoteBundle source intelligence', () => {
  it('recommends active practice when the notes contain formulas and worked examples', () => {
    const text = `
# Elasticity

Price elasticity of demand measures how responsive quantity demanded is to a change in price.
Elastic demand means quantity responds strongly, while inelastic demand means quantity changes only slightly.
Formula: Ed = % change in quantity demanded / % change in price.
Example: If price rises by 10% and quantity demanded falls by 20%, then elasticity is -2.

| Type | Elastic | Inelastic |
| ---- | ------- | --------- |
| Response | Large quantity change | Small quantity change |
| Magnitude | Greater than 1 | Less than 1 |

Elasticity helps compare products, forecast revenue effects, and interpret demand curves.
    `.trim();

    const glossary = [
      mkGlossary('Price elasticity of demand', 'A measure of how responsive quantity demanded is to a change in price.'),
      mkGlossary('Elastic demand', 'Demand where quantity changes strongly when price changes.'),
      mkGlossary('Inelastic demand', 'Demand where quantity changes only slightly when price changes.'),
    ];
    const bundle = buildWorkspaceNoteBundle({
      uploadedFiles: [mkFile(text)],
      glossaryEntries: glossary,
      courses: [mkCourse()],
      courseId: 'c1',
      concept: 'Elasticity',
      conceptBars: [],
      lang: 'en',
    });

    expect(bundle.sourceIntelligence).not.toBeNull();
    expect(bundle.sourceIntelligence?.band).not.toBe('weak');
    expect(bundle.sourceIntelligence?.bestTool).toBe('scratchpad');
    expect(bundle.sourceIntelligence?.metrics.formulaCount).toBeGreaterThan(0);
    expect(bundle.sourceIntelligence?.metrics.passageCount).toBeGreaterThan(0);
  });

  it('flags weak support when the material is sparse and loosely structured', () => {
    const text = `
Elasticity matters in markets.
It can affect demand.
Sometimes price changes matter.
Students should remember the idea for exams.
This short note does not define the concept carefully and does not include examples.
    `.trim();

    const bundle = buildWorkspaceNoteBundle({
      uploadedFiles: [mkFile(text)],
      glossaryEntries: [],
      courses: [mkCourse()],
      courseId: 'c1',
      concept: 'Elasticity',
      conceptBars: [],
      lang: 'en',
    });

    expect(bundle.sourceIntelligence).not.toBeNull();
    expect(bundle.sourceIntelligence?.band).toBe('weak');
    expect(bundle.sourceIntelligence?.gaps.length).toBeGreaterThan(0);
    expect(bundle.sourceIntelligence?.nextActions.length).toBeGreaterThan(0);
  });

  it('always provides workspace steps when source text exists', () => {
    const text = 'Elasticity matters in markets. It can affect demand. Sometimes price changes matter. Students should remember the idea for exams.';
    const bundle = buildWorkspaceNoteBundle({
      uploadedFiles: [mkFile(text)],
      glossaryEntries: [],
      courses: [mkCourse()],
      courseId: 'c1',
      concept: 'Elasticity',
      conceptBars: [],
      lang: 'en',
    });

    expect(bundle.hasSource).toBe(true);
    expect(bundle.workspaceSteps?.length).toBeGreaterThanOrEqual(2);
    expect(bundle.workspaceSteps?.at(-1)?.title).toMatch(/knowledge check/i);
  });
});
