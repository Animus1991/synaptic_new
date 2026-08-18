import { describe, expect, it } from 'vitest';
import { parseNotebookLmExport } from './notebooklmImport';
import {
  buildNotebookLmCourseBundle,
  canCreateCourseFromNotebookLm,
  notebookLmCourseTitle,
} from './notebookLmCourse';

const GUIDE = `# Study Guide — Supply & Demand

Market equilibrium is the price where quantity demanded equals quantity supplied.
When price sits above equilibrium, sellers offer more than buyers want, so a surplus forms.
Elasticity then measures how strongly quantity responds to that price change.
`;

describe('notebookLmCourse', () => {
  it('strips the study-guide prefix from the course title', () => {
    expect(notebookLmCourseTitle({ title: 'Study Guide — Supply & Demand' })).toBe('Supply & Demand');
  });

  it('creates a ready course and attaches the imported file', () => {
    const parsed = parseNotebookLmExport(GUIDE);
    expect(canCreateCourseFromNotebookLm(parsed)).toBe(true);
    const { file, course } = buildNotebookLmCourseBundle(parsed, 0);
    expect(course).toBeTruthy();
    expect(course?.status).toBe('ready');
    expect(course?.title).toBe('Supply & Demand');
    expect(file.courseId).toBe(course?.id);
    expect(file.ingestMethod).toBe('notebooklm-import');
    expect(course?.sourceFiles).toContain(file.name);
  });

  it('attaches to an existing course instead of creating one', () => {
    const parsed = parseNotebookLmExport(GUIDE);
    const { file, course } = buildNotebookLmCourseBundle(parsed, 0, { courseId: 'c-existing' });
    expect(course).toBeNull();
    expect(file.courseId).toBe('c-existing');
  });

  it('keeps a short note as a source without inventing a course', () => {
    const parsed = parseNotebookLmExport('# Note\n\nToo short.');
    const { file, course } = buildNotebookLmCourseBundle(parsed, 0);
    expect(course).toBeNull();
    expect(file.courseId).toBeUndefined();
    expect(file.ingestMethod).toBe('notebooklm-import');
  });
});
