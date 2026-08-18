import { describe, expect, it } from 'vitest';
import type { Course, Task, UploadedFile } from '../types';
import {
  assignFileToFolder,
  createLibraryFolder,
  deleteLibraryFolder,
  groupFilesByFolder,
  moveUploadedFileInLibrary,
  preserveFileExtension,
  renameCourseInLibrary,
  renameLibraryFolder,
  renameUploadedFileInLibrary,
} from './libraryOrganize';

const course = (id: string, title: string, sourceFiles: string[] = []): Course => ({
  id,
  title,
  description: '',
  subject: 'science',
  color: '#818cf8',
  icon: '📊',
  totalLessons: 1,
  completedLessons: 0,
  mastery: 0,
  difficulty: 'beginner',
  topics: [],
  createdAt: '2026-01-01',
  estimatedHours: 1,
  sourceFiles,
  status: 'ready',
  sourceMode: 'notes-only',
  conceptCount: 0,
  glossaryCount: 0,
  exerciseCount: 0,
});

const file = (id: string, name: string, courseId?: string): UploadedFile => ({
  id,
  name,
  type: 'md',
  size: 12,
  uploadedAt: '2026-01-01',
  status: 'analyzed',
  courseId,
});

const task = (id: string, courseId: string, courseName: string): Task => ({
  id,
  title: 'Review',
  description: '',
  type: 'review',
  courseId,
  courseName,
  courseColor: '#818cf8',
  courseIcon: '📊',
  priority: 'medium',
  estimatedMinutes: 10,
  xpReward: 20,
  isSpacedRepetition: false,
  status: 'pending',
  category: 'review',
  tags: [],
});

describe('libraryOrganize', () => {
  it('renames a user course and matching task labels', () => {
    const result = renameCourseInLibrary(
      [course('c-real', 'Old')],
      [task('manual-1', 'c-real', 'Old')],
      'c-real',
      '  Biology notes  ',
    );
    expect(result.renamed).toBe(true);
    expect(result.courses[0]?.title).toBe('Biology notes');
    expect(result.tasks[0]?.courseName).toBe('Biology notes');
  });

  it('rejects demo course rename', () => {
    const result = renameCourseInLibrary([course('c1', 'Micro')], [], 'c1', 'New');
    expect(result.renamed).toBe(false);
    expect(result.reason).toBe('demo');
  });

  it('keeps the file extension when renaming', () => {
    expect(preserveFileExtension('notes.md', 'Lecture 4')).toBe('Lecture 4.md');
    expect(preserveFileExtension('notes.md', 'Lecture 4.md')).toBe('Lecture 4.md');
  });

  it('renames a file and the course sourceFiles entry', () => {
    const result = renameUploadedFileInLibrary(
      [file('file-1', 'notes.md', 'c-real')],
      [course('c-real', 'Bio', ['notes.md'])],
      'file-1',
      'Chapter 1',
    );
    expect(result.renamed).toBe(true);
    expect(result.files[0]?.name).toBe('Chapter 1.md');
    expect(result.courses[0]?.sourceFiles).toEqual(['Chapter 1.md']);
  });

  it('moves a file between user courses', () => {
    const result = moveUploadedFileInLibrary(
      [file('file-1', 'notes.md', 'c-a')],
      [course('c-a', 'A', ['notes.md']), course('c-b', 'B', [])],
      'file-1',
      'c-b',
    );
    expect(result.moved).toBe(true);
    expect(result.files[0]?.courseId).toBe('c-b');
    expect(result.courses.find((c) => c.id === 'c-a')?.sourceFiles).toEqual([]);
    expect(result.courses.find((c) => c.id === 'c-b')?.sourceFiles).toEqual(['notes.md']);
  });

  it('unassigns a file from its course', () => {
    const result = moveUploadedFileInLibrary(
      [file('file-1', 'notes.md', 'c-a')],
      [course('c-a', 'A', ['notes.md'])],
      'file-1',
      null,
    );
    expect(result.moved).toBe(true);
    expect(result.files[0]?.courseId).toBeUndefined();
    expect(result.courses[0]?.sourceFiles).toEqual([]);
  });

  it('rejects moving onto a demo course', () => {
    const result = moveUploadedFileInLibrary(
      [file('file-1', 'notes.md', 'c-a')],
      [course('c-a', 'A', ['notes.md']), course('c1', 'Demo')],
      'file-1',
      'c1',
    );
    expect(result.moved).toBe(false);
    expect(result.reason).toBe('demo-target');
  });

  it('creates, assigns, and deletes a folder without dropping the file', () => {
    const made = createLibraryFolder([], '  Lectures  ');
    expect(made.created?.name).toBe('Lectures');
    const assigned = assignFileToFolder(
      [file('file-1', 'notes.md', 'c-a')],
      'file-1',
      made.created!.id,
      made.folders,
    );
    expect(assigned.files[0]?.folderId).toBe(made.created!.id);
    const renamed = renameLibraryFolder(made.folders, made.created!.id, 'Week 1');
    expect(renamed.folders[0]?.name).toBe('Week 1');
    const removed = deleteLibraryFolder(renamed.folders, assigned.files, made.created!.id);
    expect(removed.folders).toHaveLength(0);
    expect(removed.files[0]?.folderId).toBeUndefined();
  });

  it('groups files under folders and unfiled', () => {
    const made = createLibraryFolder([], 'Slides');
    const files = [
      { ...file('file-1', 'a.md'), folderId: made.created!.id },
      file('file-2', 'b.md'),
    ];
    const groups = groupFilesByFolder(files, made.folders);
    expect(groups[0]?.folder?.name).toBe('Slides');
    expect(groups[0]?.files.map((item) => item.id)).toEqual(['file-1']);
    expect(groups[1]?.folder).toBeNull();
    expect(groups[1]?.files.map((item) => item.id)).toEqual(['file-2']);
  });
});
