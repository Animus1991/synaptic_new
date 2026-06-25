import { describe, expect, it } from 'vitest';
import {
  courseNeedsReupload,
  isPipelineStale,
  reuploadMigrationMessage,
} from './pipelineMigration';
import type { Course, UploadedFile } from '../types';

const baseCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'c1',
  title: 'Test',
  description: '',
  subject: 'general',
  color: '#000',
  icon: '📚',
  totalLessons: 6,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: new Date().toISOString(),
  estimatedHours: 4,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 0,
  glossaryCount: 0,
  exerciseCount: 0,
  ...overrides,
});

describe('isPipelineStale', () => {
  it('treats missing version as stale', () => {
    expect(isPipelineStale(undefined, '2.2.0')).toBe(true);
  });

  it('detects older semver', () => {
    expect(isPipelineStale('2.0.0', '2.2.0')).toBe(true);
    expect(isPipelineStale('2.2.0', '2.2.0')).toBe(false);
    expect(isPipelineStale('2.3.0', '2.2.0')).toBe(false);
    expect(isPipelineStale('2.3.0', '2.4.0')).toBe(true);
  });
});

describe('courseNeedsReupload', () => {
  it('flags course when pipeline meta is old', () => {
    expect(
      courseNeedsReupload(
        baseCourse({ pipelineMeta: { version: '2.0.0', generatedAt: '', outlineSource: 'lexical' } }),
        [],
      ),
    ).toBe(true);
  });

  it('flags when linked file lacks current version', () => {
    const files: UploadedFile[] = [{
      id: 'f1',
      name: 'notes.pdf',
      type: 'pdf',
      size: 1,
      uploadedAt: '',
      status: 'analyzed',
      courseId: 'c1',
      pipelineVersion: '2.0.0',
    }];
    expect(courseNeedsReupload(baseCourse(), files)).toBe(true);
  });
});

describe('reuploadMigrationMessage', () => {
  it('mentions re-upload in both languages', () => {
    expect(reuploadMigrationMessage('en')).toContain('Re-upload');
    expect(reuploadMigrationMessage('el')).toContain('Ανέβασε');
  });
});
