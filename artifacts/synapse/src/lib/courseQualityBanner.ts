/**
 * CourseView / Library low-quality source banner — when to show SourceQualityBanner
 * vs ReuploadMigrationBanner without duplicate recovery prompts.
 */

import { courseNeedsReupload } from './pipelineMigration';
import { isLowSourceQuality } from './sourceQualityPrompt';
import type { Course, UploadedFile } from '../types';

export function resolveCourseQualityScore(course?: Course | null): number | null {
  const score = course?.sourceQuality?.score;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return score;
}

export function courseQualityDismissKey(courseId: string): string {
  return `synapse-low-quality:course:${courseId}`;
}

export type CourseQualityBannerDecision = {
  show: boolean;
  score: number | null;
  /** True when ReuploadMigrationBanner should take precedence over quality banner. */
  showMigrationBanner: boolean;
};

export function shouldShowCourseQualityBanner(opts: {
  course: Course;
  uploadedFiles?: UploadedFile[];
  hasReuploadHandler?: boolean;
}): CourseQualityBannerDecision {
  const score = resolveCourseQualityScore(opts.course);
  const files = opts.uploadedFiles ?? [];
  const showMigrationBanner = Boolean(
    opts.hasReuploadHandler && courseNeedsReupload(opts.course, files),
  );

  if (!isLowSourceQuality(score)) {
    return { show: false, score, showMigrationBanner };
  }

  if (showMigrationBanner) {
    return { show: false, score, showMigrationBanner };
  }

  return { show: true, score, showMigrationBanner };
}
