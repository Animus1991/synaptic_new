import { describe, expect, it } from 'vitest';
import {
  courseQualityDismissKey,
  resolveCourseQualityScore,
  shouldShowCourseQualityBanner,
} from './courseQualityBanner';
import type { Course, CourseSourceQuality, UploadedFile } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

const baseCourse: Course = {
  id: 'c-banner',
  title: 'Test Course',
  description: 'Test',
  subject: 'Economics',
  color: '#818cf8',
  icon: '📚',
  totalLessons: 4,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'intermediate',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 2,
  sourceFiles: ['notes.pdf'],
  status: 'ready',
  sourceMode: 'enriched',
  conceptCount: 2,
  glossaryCount: 1,
  exerciseCount: 1,
  pipelineMeta: { version: CONTENT_PIPELINE_VERSION, generatedAt: '2026-01-01', outlineSource: 'lexical' },
};

const currentFile: UploadedFile = {
  id: 'f-1',
  name: 'notes.pdf',
  type: 'pdf',
  size: 1000,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId: 'c-banner',
  extractedText: 'Sample lecture text with enough words for analysis.',
  pipelineVersion: CONTENT_PIPELINE_VERSION,
};

const weakQuality: CourseSourceQuality = {
  score: 37,
  band: 'weak',
  detectedTopicCount: 2,
  finalTopicCount: 2,
  needsMoreMaterial: true,
  outlineAdjusted: false,
  recommendedTopicCount: 4,
  warnings: ['Sparse sections'],
  strengths: [],
  nextActions: ['Re-upload clearer scan'],
  metrics: {
    wordCount: 100,
    sectionCount: 2,
    definitionCount: 1,
    glossaryCount: 1,
    keyphraseCount: 3,
    workedExampleCount: 0,
    formulaCount: 0,
    comparisonCount: 0,
    averageConceptsPerTopic: 1,
  },
};

describe('courseQualityBanner', () => {
  it('shows banner for low score when pipeline is current', () => {
    const course = { ...baseCourse, sourceQuality: weakQuality };
    const decision = shouldShowCourseQualityBanner({
      course,
      uploadedFiles: [currentFile],
      hasReuploadHandler: true,
    });
    expect(decision.show).toBe(true);
    expect(decision.score).toBe(37);
    expect(decision.showMigrationBanner).toBe(false);
  });

  it('hides banner for acceptable quality scores', () => {
    const course = {
      ...baseCourse,
      sourceQuality: { ...weakQuality, score: 72, band: 'moderate' as const, needsMoreMaterial: false },
    };
    expect(shouldShowCourseQualityBanner({ course, uploadedFiles: [currentFile] }).show).toBe(false);
  });

  it('does not crash when sourceQuality is missing', () => {
    expect(resolveCourseQualityScore(baseCourse)).toBeNull();
    expect(shouldShowCourseQualityBanner({ course: baseCourse }).show).toBe(false);
  });

  it('defers to migration banner when pipeline is stale', () => {
    const staleFile = { ...currentFile, pipelineVersion: '2.0.0' };
    const course = {
      ...baseCourse,
      pipelineMeta: { version: '2.0.0', generatedAt: '2026-01-01', outlineSource: 'lexical' as const },
      sourceQuality: { ...weakQuality, score: 30 },
    };
    const decision = shouldShowCourseQualityBanner({
      course,
      uploadedFiles: [staleFile],
      hasReuploadHandler: true,
    });
    expect(decision.showMigrationBanner).toBe(true);
    expect(decision.show).toBe(false);
  });

  it('builds stable dismiss keys per course', () => {
    expect(courseQualityDismissKey('c-banner')).toBe('synapse-low-quality:course:c-banner');
  });
});
