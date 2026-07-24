import type { Course, GlossaryEntry, UploadedFile } from '../types';
import { normalizeConcept } from './contentAnalysis';
import type { PersistedLibrary } from './libraryStorage';

export type LibrarySyncConflictKind = 'course' | 'file' | 'glossary';

export type LibrarySyncConflictItem = {
  kind: LibrarySyncConflictKind;
  id: string;
  localLabel: string;
  remoteLabel: string;
};

export type LibraryMergeResult = {
  merged: PersistedLibrary;
  conflicts: LibrarySyncConflictItem[];
  /** Local snapshot before merge — used to restore local versions. */
  localSnapshot: PersistedLibrary;
};

function fileFingerprint(f: UploadedFile): string {
  return JSON.stringify({
    name: f.name,
    size: f.size,
    status: f.status,
    courseId: f.courseId ?? '',
    uploadedAt: f.uploadedAt,
    textLen: f.extractedText?.length ?? 0,
    pipelineVersion: f.pipelineVersion ?? '',
  });
}

function courseFingerprint(c: Course): string {
  return JSON.stringify({
    title: c.title,
    status: c.status,
    mastery: c.mastery,
    completedLessons: c.completedLessons,
    sourceFiles: [...c.sourceFiles].sort(),
    topicTitles: c.topics.map((t) => t.title).sort(),
    conceptCount: c.conceptCount,
    glossaryCount: c.glossaryCount,
  });
}

function glossaryKey(g: GlossaryEntry): string {
  return `${g.courseId ?? ''}:${normalizeConcept(g.term)}`;
}

function glossaryFingerprint(g: GlossaryEntry): string {
  return JSON.stringify({
    term: g.term,
    definition: g.definition,
    courseId: g.courseId ?? '',
  });
}

/** Detect overlapping local/remote items that differ (remote-wins merge would overwrite local). */
export function detectLibrarySyncConflicts(
  local: PersistedLibrary,
  remote: PersistedLibrary,
): LibrarySyncConflictItem[] {
  const conflicts: LibrarySyncConflictItem[] = [];

  const remoteFiles = new Map(remote.uploadedFiles.map((f) => [f.id, f]));
  for (const localFile of local.uploadedFiles) {
    const remoteFile = remoteFiles.get(localFile.id);
    if (!remoteFile) continue;
    if (fileFingerprint(localFile) !== fileFingerprint(remoteFile)) {
      conflicts.push({
        kind: 'file',
        id: localFile.id,
        localLabel: localFile.name,
        remoteLabel: remoteFile.name,
      });
    }
  }

  const remoteCourses = new Map(remote.generatedCourses.map((c) => [c.id, c]));
  for (const localCourse of local.generatedCourses) {
    const remoteCourse = remoteCourses.get(localCourse.id);
    if (!remoteCourse) continue;
    if (courseFingerprint(localCourse) !== courseFingerprint(remoteCourse)) {
      conflicts.push({
        kind: 'course',
        id: localCourse.id,
        localLabel: localCourse.title,
        remoteLabel: remoteCourse.title,
      });
    }
  }

  const remoteGlossary = new Map(remote.glossaryEntries.map((g) => [glossaryKey(g), g]));
  for (const localEntry of local.glossaryEntries) {
    const key = glossaryKey(localEntry);
    const remoteEntry = remoteGlossary.get(key);
    if (!remoteEntry) continue;
    if (glossaryFingerprint(localEntry) !== glossaryFingerprint(remoteEntry)) {
      conflicts.push({
        kind: 'glossary',
        id: key,
        localLabel: localEntry.term,
        remoteLabel: remoteEntry.term,
      });
    }
  }

  return conflicts;
}

/** Merge remote library into local — remote entries win on id/title conflicts. */
export function mergeLibraries(local: PersistedLibrary, remote: PersistedLibrary): PersistedLibrary {
  const fileMap = new Map(local.uploadedFiles.map((f) => [f.id, f]));
  for (const f of remote.uploadedFiles) {
    fileMap.set(f.id, f);
  }

  const glossaryMap = new Map(
    local.glossaryEntries.map((g) => [glossaryKey(g), g]),
  );
  for (const g of remote.glossaryEntries) {
    glossaryMap.set(glossaryKey(g), g);
  }

  const courseMap = new Map(local.generatedCourses.map((c) => [c.id, c]));
  for (const c of remote.generatedCourses) {
    const existing = courseMap.get(c.id);
    if (!existing) {
      courseMap.set(c.id, c);
      continue;
    }
    courseMap.set(c.id, {
      ...existing,
      ...c,
      topics: mergeTopics(existing.topics, c.topics),
      sourceFiles: [...new Set([...existing.sourceFiles, ...c.sourceFiles])],
    });
  }

  return {
    uploadedFiles: [...fileMap.values()],
    glossaryEntries: [...glossaryMap.values()],
    generatedCourses: [...courseMap.values()],
  };
}

/** Merge + conflict report for Library sync UX (OPT-L5). */
export function mergeLibrariesWithConflicts(
  local: PersistedLibrary,
  remote: PersistedLibrary,
): LibraryMergeResult {
  const localSnapshot: PersistedLibrary = {
    uploadedFiles: [...local.uploadedFiles],
    glossaryEntries: [...local.glossaryEntries],
    generatedCourses: [...local.generatedCourses],
  };
  return {
    merged: mergeLibraries(local, remote),
    conflicts: detectLibrarySyncConflicts(local, remote),
    localSnapshot,
  };
}

function mergeTopics(existing: Course['topics'], incoming: Course['topics']): Course['topics'] {
  const map = new Map(existing.map((t) => [normalizeConcept(t.title), t]));
  for (const t of incoming) {
    const key = normalizeConcept(t.title);
    if (!map.has(key)) map.set(key, t);
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

export function remoteLibraryToPersisted(remote: {
  uploadedFiles?: unknown[];
  glossaryEntries?: unknown[];
  generatedCourses?: unknown[];
}): PersistedLibrary {
  return {
    uploadedFiles: (remote.uploadedFiles ?? []) as UploadedFile[],
    glossaryEntries: (remote.glossaryEntries ?? []) as GlossaryEntry[],
    generatedCourses: (remote.generatedCourses ?? []) as Course[],
  };
}

/** Count pending spaced-repetition tasks — SSoT for shell reviews badge after cascade. */
export function countPendingReviewsDue(tasks: { isSpacedRepetition: boolean; status: string }[]): number {
  return tasks.filter((t) => t.isSpacedRepetition && t.status === 'pending').length;
}
