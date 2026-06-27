/**
 * C9 — bulk reprocess stale courses from a Synapse export JSON.
 *
 * Usage:
 *   SYNAPSE_EXPORT=./export.json npm run reprocess:stale
 *   SYNAPSE_EXPORT=./export.json npm run reprocess:stale -- --apply
 *   SYNAPSE_EXPORT=./export.json SYNAPSE_OUTPUT=./export-v251.json npm run reprocess:stale -- --apply
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { courseNeedsReupload } from '../lib/pipelineMigration';
import {
  reprocessCourseFromStoredText,
  regenerateGlossaryAfterReprocess,
  regenerateTasksAfterReprocess,
} from '../lib/pipelineReprocess';
import { CONTENT_PIPELINE_VERSION } from '../lib/pipelineConstants';
import type { Course, GlossaryEntry, Task, UploadedFile } from '../types';

type ExportShape = {
  courses?: Course[];
  uploadedFiles?: UploadedFile[];
  files?: UploadedFile[];
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  glossary?: GlossaryEntry[];
};

function loadExport(path: string): Required<Pick<ExportShape, 'courses' | 'uploadedFiles' | 'tasks' | 'glossaryEntries'>> {
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw) as ExportShape;
  return {
    courses: data.courses ?? [],
    uploadedFiles: data.uploadedFiles ?? data.files ?? [],
    tasks: data.tasks ?? [],
    glossaryEntries: data.glossaryEntries ?? data.glossary ?? [],
  };
}

describe.sequential('bulkReprocessStale (C9)', () => {
  it('reprocesses courses on stale pipeline versions', { timeout: 120_000 }, () => {
    const inputPath = process.env.SYNAPSE_EXPORT ?? 'synapse-export.json';
    if (!existsSync(inputPath)) {
      // eslint-disable-next-line no-console
      console.warn(`[reprocess:stale] skip — export not found at ${inputPath}`);
      return;
    }

    const apply = process.argv.includes('--apply');
    const outputPath = process.env.SYNAPSE_OUTPUT ?? inputPath.replace(/\.json$/i, '-reprocessed.json');

    const state = loadExport(inputPath);
    let staleCount = 0;
    let okCount = 0;
    let skipCount = 0;

    for (const course of state.courses) {
      if (!courseNeedsReupload(course, state.uploadedFiles)) continue;
      staleCount += 1;
      const result = reprocessCourseFromStoredText(course, state.uploadedFiles);
      if (!result) {
        skipCount += 1;
        // eslint-disable-next-line no-console
        console.warn(`[reprocess:stale] skip ${course.id} — no stored text`);
        continue;
      }
      okCount += 1;
      if (!apply) {
        // eslint-disable-next-line no-console
        console.info(
          `[reprocess:stale] dry-run ${course.id}: ${course.pipelineMeta?.version ?? '?'} → ${CONTENT_PIPELINE_VERSION}`,
        );
        continue;
      }

      const idx = state.courses.findIndex((c) => c.id === course.id);
      if (idx >= 0) state.courses[idx] = result.course;

      state.uploadedFiles = state.uploadedFiles.map((f) => {
        const updated = result.files.find((u) => u.id === f.id);
        return updated ?? f;
      });

      state.tasks = regenerateTasksAfterReprocess(state.tasks, result.course);
      state.glossaryEntries = regenerateGlossaryAfterReprocess(
        state.glossaryEntries,
        result.course.id,
        result.glossary,
      );

      // eslint-disable-next-line no-console
      console.info(`[reprocess:stale] applied ${course.id} → v${CONTENT_PIPELINE_VERSION}`);
    }

    // eslint-disable-next-line no-console
    console.info(
      `[reprocess:stale] stale=${staleCount} reprocessed=${okCount} skipped=${skipCount} apply=${apply}`,
    );

    if (apply && okCount > 0) {
      writeFileSync(outputPath, JSON.stringify(state, null, 2), 'utf8');
      // eslint-disable-next-line no-console
      console.info(`[reprocess:stale] wrote ${outputPath}`);
    }

    expect(staleCount).toBeGreaterThanOrEqual(0);
  });
});
