import { describe, expect, it } from 'vitest';
import { buildCourseExamPrepModel, courseLooksLikeInformatics } from './courseExamPrep';

describe('buildCourseExamPrepModel', () => {
  it('builds methods from headings and glossary from course terms', () => {
    const model = buildCourseExamPrepModel({
      courseTitle: 'Microeconomics',
      concept: 'Elasticity',
      notes: '# Demand\n\nBody\n\n## Price elasticity\n\nBody',
      glossary: [
        { term: 'Elasticity', definition: 'Responsiveness of quantity to price changes.', source: 'n', relatedConcepts: [], courseId: 'c1' },
      ],
      lang: 'en',
    });
    expect(model.hasCourseContent).toBe(true);
    expect(model.methods.some((m) => /Demand|elasticity/i.test(m.title))).toBe(true);
    expect(model.glossary[0]?.term).toBe('Elasticity');
  });

  it('is empty when the course has no outline or glossary', () => {
    const model = buildCourseExamPrepModel({ notes: 'short', glossary: [] });
    expect(model.hasCourseContent).toBe(false);
  });
});

describe('courseLooksLikeInformatics', () => {
  it('detects CS courses and rejects economics', () => {
    expect(courseLooksLikeInformatics({ courseTitle: 'Algorithms', notes: 'BFS and DFS' })).toBe(true);
    expect(courseLooksLikeInformatics({ courseTitle: 'Microeconomics', concept: 'Elasticity' })).toBe(false);
  });
});
