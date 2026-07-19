/**
 * TOOL-RD-03 — Detect pre-2.4 pipeline material likely to have garbled Greek / column-order damage.
 * Column-major PDF extract landed in v2.4; older stored text should be reprocessed or re-uploaded.
 */

import { isPipelineStale, parsePipelineVersion } from './pipelineMigration';
import { textLayerLooksCorrupted } from './textQualityMetrics';
import type { Course, UploadedFile } from '../types';
import type { Lang } from './i18n';

/** First pipeline version with column-major PDF extract + Greek hygiene path. */
export const COLUMN_MAJOR_PIPELINE_VERSION = '2.4.0';

export function isPreColumnMajorPipeline(version?: string): boolean {
  return isPipelineStale(version, COLUMN_MAJOR_PIPELINE_VERSION);
}

export function fileNeedsPre24GreekReprocess(file: UploadedFile): boolean {
  if (!isPreColumnMajorPipeline(file.pipelineVersion)) return false;
  const text = file.extractedText?.trim() ?? '';
  if (text.length < 40) return true;
  return textLayerLooksCorrupted(text);
}

export function courseNeedsPre24GreekReprocess(
  course: Course,
  files: UploadedFile[],
): boolean {
  if (isPreColumnMajorPipeline(course.pipelineMeta?.version)) {
    const linked = files.filter((f) => f.courseId === course.id);
    if (linked.length === 0) return true;
    return linked.some((f) => fileNeedsPre24GreekReprocess(f));
  }
  return files
    .filter((f) => f.courseId === course.id)
    .some((f) => fileNeedsPre24GreekReprocess(f));
}

export function pre24GreekReprocessMessage(lang: Lang): string {
  if (lang === 'el') {
    return 'Το κείμενο φαίνεται να προέρχεται από pipeline πριν το v2.4 (πιθανή παραμόρφωση ελληνικών / στηλών). Επανάλαβε την επεξεργασία για επιδιόρθωση χωρίς νέο ανέβασμα, ή ανέβασε ξανά το PDF.';
  }
  return 'This text looks like a pre-v2.4 pipeline extract (possible garbled Greek / column order). Reprocess to repair without re-uploading, or re-upload the PDF.';
}

export function describePipelineAge(version?: string): string {
  const p = parsePipelineVersion(version);
  if (!p) return 'unknown';
  return `${p[0]}.${p[1]}.${p[2]}`;
}
