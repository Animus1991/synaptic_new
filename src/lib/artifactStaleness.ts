/**
 * Version-aware stale flags for generated practice artifacts (quiz, cards, sim)
 * after source reprocess. User edits (annotations, scratchpad) stay but may need review.
 */

import { loadJson, saveJson } from './persistence';

export type StalePracticeTool = 'quiz' | 'leitner' | 'simulator';

const STORAGE_KEY = 'artifact-staleness';

export type CourseArtifactStaleness = {
  processingVersion: string;
  markedAt: string;
  staleTools: StalePracticeTool[];
};

type StalenessStore = Record<string, CourseArtifactStaleness>;

const ALL_PRACTICE_TOOLS: StalePracticeTool[] = ['quiz', 'leitner', 'simulator'];

function loadStore(): StalenessStore {
  return loadJson<StalenessStore>(STORAGE_KEY, {});
}

function saveStore(store: StalenessStore): void {
  saveJson(STORAGE_KEY, store);
}

/** Mark quiz / flashcard / simulator content stale for a course after reprocess. */
export function markCourseArtifactsStale(courseId: string, processingVersion: string): CourseArtifactStaleness {
  const record: CourseArtifactStaleness = {
    processingVersion,
    markedAt: new Date().toISOString(),
    staleTools: [...ALL_PRACTICE_TOOLS],
  };
  const store = loadStore();
  store[courseId] = record;
  saveStore(store);
  return record;
}

export function getCourseArtifactStaleness(courseId: string | undefined): CourseArtifactStaleness | null {
  if (!courseId) return null;
  return loadStore()[courseId] ?? null;
}

export function isToolArtifactStale(courseId: string | undefined, tool: StalePracticeTool): boolean {
  const rec = getCourseArtifactStaleness(courseId);
  return rec?.staleTools.includes(tool) ?? false;
}

export function getStalePracticeTools(courseId: string | undefined): StalePracticeTool[] {
  return getCourseArtifactStaleness(courseId)?.staleTools ?? [];
}

/** User acknowledged refreshed content for one practice tool. */
export function acknowledgeStaleTool(courseId: string, tool: StalePracticeTool): void {
  const store = loadStore();
  const rec = store[courseId];
  if (!rec) return;
  const nextTools = rec.staleTools.filter((t) => t !== tool);
  if (nextTools.length === 0) {
    delete store[courseId];
  } else {
    store[courseId] = { ...rec, staleTools: nextTools };
  }
  saveStore(store);
}

export function clearCourseArtifactsStale(courseId: string): void {
  const store = loadStore();
  if (!store[courseId]) return;
  delete store[courseId];
  saveStore(store);
}
