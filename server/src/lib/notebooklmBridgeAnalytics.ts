import { findByEmailAsync } from '../store/accounts';
import type { ClassEnrollment } from '../store/classStore';
import { getLibraryAsync } from '../store/libraryStore';

export const NOTEBOOKLM_INGEST_METHODS = [
  'notebooklm-import',
  'notebooklm-chat',
  'notebooklm-audio-transcript',
] as const;

export type NotebookLmIngestMethod = (typeof NOTEBOOKLM_INGEST_METHODS)[number];

export type LibraryFileRow = {
  ingestMethod?: string;
  courseId?: string;
};

export type NotebookLmBridgeCell = {
  enrollmentId: string;
  studentLabel: string;
  importCount: number;
  chatCount: number;
  audioCount: number;
  totalCount: number;
  adoptionLevel: number;
};

export type CohortNotebookLmHeatmap = {
  classId: string;
  className: string;
  students: NotebookLmBridgeCell[];
  studentsWithImports: number;
  totalImports: number;
  artifactTotals: { import: number; chat: number; audio: number };
};

export function isNotebookLmIngestMethod(ingestMethod?: string): ingestMethod is NotebookLmIngestMethod {
  return NOTEBOOKLM_INGEST_METHODS.includes(ingestMethod as NotebookLmIngestMethod);
}

export function summarizeNotebookLmFiles(
  files: LibraryFileRow[],
  classCourseId?: string,
): { import: number; chat: number; audio: number } {
  const totals = { import: 0, chat: 0, audio: 0 };
  for (const file of files) {
    if (!isNotebookLmIngestMethod(file.ingestMethod)) continue;
    if (classCourseId && file.courseId && file.courseId !== classCourseId) continue;
    if (file.ingestMethod === 'notebooklm-chat') totals.chat += 1;
    else if (file.ingestMethod === 'notebooklm-audio-transcript') totals.audio += 1;
    else totals.import += 1;
  }
  return totals;
}

export function buildNotebookLmBridgeCell(
  enrollment: ClassEnrollment,
  files: LibraryFileRow[],
  classCourseId?: string,
): NotebookLmBridgeCell {
  const totals = summarizeNotebookLmFiles(files, classCourseId);
  const totalCount = totals.import + totals.chat + totals.audio;
  const studentLabel =
    enrollment.displayName?.trim()
    || enrollment.studentEmail.split('@')[0]
    || 'Student';
  return {
    enrollmentId: enrollment.id,
    studentLabel,
    importCount: totals.import,
    chatCount: totals.chat,
    audioCount: totals.audio,
    totalCount,
    adoptionLevel: totalCount > 0 ? Math.min(1, totalCount / 3) : 0,
  };
}

export async function resolveNotebookLmBridgeCellsAsync(
  roster: ClassEnrollment[],
  classCourseId?: string,
): Promise<NotebookLmBridgeCell[]> {
  const cells: NotebookLmBridgeCell[] = [];
  for (const enrollment of roster) {
    const account = await findByEmailAsync(enrollment.studentEmail);
    if (!account) {
      cells.push(buildNotebookLmBridgeCell(enrollment, [], classCourseId));
      continue;
    }
    const lib = await getLibraryAsync(account.id);
    const files = (lib.uploadedFiles ?? []) as LibraryFileRow[];
    cells.push(buildNotebookLmBridgeCell(enrollment, files, classCourseId));
  }
  return cells;
}

export function buildNotebookLmCohortHeatmap(
  classId: string,
  className: string,
  students: NotebookLmBridgeCell[],
): CohortNotebookLmHeatmap {
  const artifactTotals = students.reduce(
    (acc, s) => ({
      import: acc.import + s.importCount,
      chat: acc.chat + s.chatCount,
      audio: acc.audio + s.audioCount,
    }),
    { import: 0, chat: 0, audio: 0 },
  );
  const studentsWithImports = students.filter((s) => s.totalCount > 0).length;
  const totalImports = artifactTotals.import + artifactTotals.chat + artifactTotals.audio;
  return {
    classId,
    className,
    students,
    studentsWithImports,
    totalImports,
    artifactTotals,
  };
}
