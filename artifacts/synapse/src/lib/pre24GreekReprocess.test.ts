import { describe, expect, it } from 'vitest';
import {
  COLUMN_MAJOR_PIPELINE_VERSION,
  courseNeedsPre24GreekReprocess,
  fileNeedsPre24GreekReprocess,
  isPreColumnMajorPipeline,
} from './pre24GreekReprocess';
import type { Course, UploadedFile } from '../types';

const file = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'f1',
  name: 'notes.pdf',
  type: 'pdf',
  size: 1,
  uploadedAt: '',
  status: 'analyzed',
  courseId: 'c1',
  extractedText: 'Δ ι α ν ο μ ή   ε ι σ ο δ ή μ α τ ο ς',
  pipelineVersion: '2.3.0',
  ...overrides,
});

const course = (overrides: Partial<Course> = {}): Course => ({
  id: 'c1',
  title: 'Test',
  description: '',
  subject: 'general',
  color: '#000',
  icon: 'book',
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: '',
  estimatedHours: 1,
  sourceFiles: [],
  status: 'ready',
  sourceMode: 'strict',
  conceptCount: 0,
  glossaryCount: 0,
  exerciseCount: 0,
  ...overrides,
});

describe('pre24GreekReprocess', () => {
  it('flags versions before column-major cutover', () => {
    expect(isPreColumnMajorPipeline('2.3.9')).toBe(true);
    expect(isPreColumnMajorPipeline(COLUMN_MAJOR_PIPELINE_VERSION)).toBe(false);
    expect(isPreColumnMajorPipeline('2.5.1')).toBe(false);
    expect(isPreColumnMajorPipeline(undefined)).toBe(true);
  });

  it('flags pre-2.4 files with corrupted Greek spacing', () => {
    expect(fileNeedsPre24GreekReprocess(file())).toBe(true);
    expect(fileNeedsPre24GreekReprocess(file({ pipelineVersion: '2.5.1' }))).toBe(false);
  });

  it('aggregates at course level', () => {
    expect(courseNeedsPre24GreekReprocess(course(), [file()])).toBe(true);
    expect(
      courseNeedsPre24GreekReprocess(
        course({ pipelineMeta: { version: '2.5.1', generatedAt: '', outlineSource: 'lexical' } }),
        [file({ pipelineVersion: '2.5.1', extractedText: 'Καθαρό ελληνικό κείμενο με κανονικά κενά.' })],
      ),
    ).toBe(false);
  });
});
