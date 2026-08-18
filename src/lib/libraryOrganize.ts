import type { Course, LibraryFolder, Task, UploadedFile } from '../types';
import { isDemoCourse } from './demoMode';
import { loadJson, saveJson } from './persistence';

export function isDemoLibraryFile(fileId: string): boolean {
  return fileId.startsWith('demo-file-');
}

export function sanitizeLibraryName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function preserveFileExtension(currentName: string, nextName: string): string {
  const trimmed = sanitizeLibraryName(nextName);
  if (!trimmed) return '';
  const dot = currentName.lastIndexOf('.');
  const ext = dot > 0 ? currentName.slice(dot) : '';
  if (!ext) return trimmed;
  if (trimmed.toLowerCase().endsWith(ext.toLowerCase())) return trimmed;
  return `${trimmed}${ext}`;
}

export type OrganizeFailReason = 'demo' | 'not-found' | 'empty' | 'unchanged';

export type RenameCourseResult = {
  courses: Course[];
  tasks: Task[];
  renamed: boolean;
  reason?: OrganizeFailReason;
};

export function renameCourseInLibrary(
  courses: Course[],
  tasks: Task[],
  courseId: string,
  title: string,
): RenameCourseResult {
  if (isDemoCourse(courseId)) {
    return { courses, tasks, renamed: false, reason: 'demo' };
  }
  const nextTitle = sanitizeLibraryName(title);
  if (!nextTitle) return { courses, tasks, renamed: false, reason: 'empty' };
  const existing = courses.find((course) => course.id === courseId);
  if (!existing) return { courses, tasks, renamed: false, reason: 'not-found' };
  if (existing.title === nextTitle) return { courses, tasks, renamed: false, reason: 'unchanged' };
  return {
    courses: courses.map((course) => (course.id === courseId ? { ...course, title: nextTitle } : course)),
    tasks: tasks.map((task) => (task.courseId === courseId ? { ...task, courseName: nextTitle } : task)),
    renamed: true,
  };
}

export type RenameFileResult = {
  files: UploadedFile[];
  courses: Course[];
  renamed: boolean;
  reason?: OrganizeFailReason;
};

export function renameUploadedFileInLibrary(
  files: UploadedFile[],
  courses: Course[],
  fileId: string,
  name: string,
): RenameFileResult {
  if (isDemoLibraryFile(fileId)) {
    return { files, courses, renamed: false, reason: 'demo' };
  }
  const target = files.find((file) => file.id === fileId);
  if (!target) return { files, courses, renamed: false, reason: 'not-found' };
  const nextName = preserveFileExtension(target.name, name);
  if (!nextName) return { files, courses, renamed: false, reason: 'empty' };
  if (target.name === nextName) return { files, courses, renamed: false, reason: 'unchanged' };
  const nextFiles = files.map((file) => (file.id === fileId ? { ...file, name: nextName } : file));
  const nextCourses = courses.map((course) => {
    if (!target.courseId || course.id !== target.courseId) return course;
    return {
      ...course,
      sourceFiles: course.sourceFiles.map((entry) => (entry === target.name ? nextName : entry)),
    };
  });
  return { files: nextFiles, courses: nextCourses, renamed: true };
}

export type MoveFileResult = {
  files: UploadedFile[];
  courses: Course[];
  moved: boolean;
  reason?: OrganizeFailReason | 'demo-target';
};

function sourceFilesFor(courseId: string, files: UploadedFile[]): string[] {
  return files.filter((file) => file.courseId === courseId).map((file) => file.name);
}

export function moveUploadedFileInLibrary(
  files: UploadedFile[],
  courses: Course[],
  fileId: string,
  targetCourseId: string | null,
): MoveFileResult {
  if (isDemoLibraryFile(fileId)) {
    return { files, courses, moved: false, reason: 'demo' };
  }
  if (targetCourseId && isDemoCourse(targetCourseId)) {
    return { files, courses, moved: false, reason: 'demo-target' };
  }
  const target = files.find((file) => file.id === fileId);
  if (!target) return { files, courses, moved: false, reason: 'not-found' };
  const fromId = target.courseId ?? null;
  const toId = targetCourseId;
  if (fromId === toId) return { files, courses, moved: false, reason: 'unchanged' };
  if (toId && !courses.some((course) => course.id === toId)) {
    return { files, courses, moved: false, reason: 'not-found' };
  }
  const nextFiles = files.map((file) => (
    file.id === fileId
      ? { ...file, courseId: toId ?? undefined }
      : file
  ));
  const touched = new Set([fromId, toId].filter((id): id is string => Boolean(id)));
  const nextCourses = courses.map((course) => (
    touched.has(course.id)
      ? { ...course, sourceFiles: sourceFilesFor(course.id, nextFiles) }
      : course
  ));
  return { files: nextFiles, courses: nextCourses, moved: true };
}

const FOLDERS_KEY = 'library-folders-v1';
const FOLDER_LIMIT = 40;

export function loadLibraryFolders(): LibraryFolder[] {
  const rows = loadJson<LibraryFolder[]>(FOLDERS_KEY, []);
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === 'string' && typeof row.name === 'string') : [];
}

export function saveLibraryFolders(folders: LibraryFolder[]): void {
  saveJson(FOLDERS_KEY, folders.slice(0, FOLDER_LIMIT));
}

export function createLibraryFolder(folders: LibraryFolder[], name: string, now = new Date()): {
  folders: LibraryFolder[];
  created: LibraryFolder | null;
  reason?: OrganizeFailReason | 'limit';
} {
  const nextName = sanitizeLibraryName(name);
  if (!nextName) return { folders, created: null, reason: 'empty' };
  if (folders.length >= FOLDER_LIMIT) return { folders, created: null, reason: 'limit' };
  const folder: LibraryFolder = {
    id: `folder-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: nextName.slice(0, 80),
    createdAt: now.toISOString(),
  };
  return { folders: [...folders, folder], created: folder };
}

export function renameLibraryFolder(folders: LibraryFolder[], folderId: string, name: string): {
  folders: LibraryFolder[];
  renamed: boolean;
  reason?: OrganizeFailReason;
} {
  const nextName = sanitizeLibraryName(name).slice(0, 80);
  if (!nextName) return { folders, renamed: false, reason: 'empty' };
  const existing = folders.find((folder) => folder.id === folderId);
  if (!existing) return { folders, renamed: false, reason: 'not-found' };
  if (existing.name === nextName) return { folders, renamed: false, reason: 'unchanged' };
  return {
    folders: folders.map((folder) => (folder.id === folderId ? { ...folder, name: nextName } : folder)),
    renamed: true,
  };
}

export function deleteLibraryFolder(
  folders: LibraryFolder[],
  files: UploadedFile[],
  folderId: string,
): { folders: LibraryFolder[]; files: UploadedFile[]; deleted: boolean; reason?: OrganizeFailReason } {
  if (!folders.some((folder) => folder.id === folderId)) {
    return { folders, files, deleted: false, reason: 'not-found' };
  }
  return {
    folders: folders.filter((folder) => folder.id !== folderId),
    files: files.map((file) => (file.folderId === folderId ? { ...file, folderId: undefined } : file)),
    deleted: true,
  };
}

export function assignFileToFolder(
  files: UploadedFile[],
  fileId: string,
  folderId: string | null,
  folders: LibraryFolder[],
): { files: UploadedFile[]; assigned: boolean; reason?: OrganizeFailReason } {
  if (isDemoLibraryFile(fileId)) return { files, assigned: false, reason: 'demo' };
  const target = files.find((file) => file.id === fileId);
  if (!target) return { files, assigned: false, reason: 'not-found' };
  if (folderId && !folders.some((folder) => folder.id === folderId)) {
    return { files, assigned: false, reason: 'not-found' };
  }
  const nextId = folderId || undefined;
  if (target.folderId === nextId) return { files, assigned: false, reason: 'unchanged' };
  return {
    files: files.map((file) => (file.id === fileId ? { ...file, folderId: nextId } : file)),
    assigned: true,
  };
}

export type FolderFileGroup = {
  folder: LibraryFolder | null;
  files: UploadedFile[];
};

export function groupFilesByFolder(files: UploadedFile[], folders: LibraryFolder[]): FolderFileGroup[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const groups = new Map<string, UploadedFile[]>();
  const unfiled: UploadedFile[] = [];
  for (const file of files) {
    const folder = file.folderId ? byId.get(file.folderId) : undefined;
    if (!folder) {
      unfiled.push(file);
      continue;
    }
    const list = groups.get(folder.id) ?? [];
    list.push(file);
    groups.set(folder.id, list);
  }
  const ordered = [...folders]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({ folder, files: groups.get(folder.id) ?? [] }));
  return [...ordered, { folder: null, files: unfiled }];
}
