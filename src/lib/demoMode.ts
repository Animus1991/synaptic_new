import type { Course, Task, UserSettings, UploadedFile, GlossaryEntry } from '../types';

/** Demo seed IDs — never treat as user-generated content. */
export const MOCK_COURSE_IDS = new Set(['c1', 'c2', 'c3', 'c4']);
export const MOCK_TASK_IDS = new Set([
  'task1', 'task2', 'task3', 'task4', 'task5',
  'task6', 'task7', 'task8', 'task9', 'task10',
]);

export function shouldShowDemo(settings: UserSettings): boolean {
  return settings.showDemoContent === true;
}

export function isDemoCourse(id: string): boolean {
  return MOCK_COURSE_IDS.has(id);
}

export function isDemoTask(id: string): boolean {
  return MOCK_TASK_IDS.has(id);
}

export function visibleCourses(courses: Course[], settings: UserSettings): Course[] {
  if (shouldShowDemo(settings)) return courses;
  return courses.filter((c) => !isDemoCourse(c.id));
}

export function visibleTasks(tasks: Task[], settings: UserSettings): Task[] {
  if (shouldShowDemo(settings)) return tasks;
  return tasks.filter((t) => !isDemoTask(t.id));
}

export function initialCourses(
  generated: Course[],
  settings: UserSettings,
  mockCourses: Course[],
): Course[] {
  return shouldShowDemo(settings) ? [...mockCourses, ...generated] : generated;
}

export function stripDemoFromTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isDemoTask(t.id));
}

const isDemoFile = (f: { id: string }): boolean => f.id.startsWith('demo-file-');

/** Inject in-memory demo source when demo content is enabled; never persisted. */
export function initialUploadedFiles(
  libraryFiles: UploadedFile[],
  settings: UserSettings,
  demoFiles: UploadedFile[],
): UploadedFile[] {
  if (!shouldShowDemo(settings)) return libraryFiles.filter((f) => !isDemoFile(f));
  const have = new Set(libraryFiles.map((f) => f.id));
  const add = demoFiles.filter((f) => !have.has(f.id));
  return add.length ? [...add, ...libraryFiles] : libraryFiles;
}

export function initialGlossary(
  libraryGlossary: GlossaryEntry[],
  settings: UserSettings,
  demoGlossary: GlossaryEntry[],
): GlossaryEntry[] {
  if (!shouldShowDemo(settings)) return libraryGlossary;
  const have = new Set(libraryGlossary.map((g) => `${g.courseId}::${g.term}`));
  const add = demoGlossary.filter((g) => !have.has(`${g.courseId}::${g.term}`));
  return add.length ? [...add, ...libraryGlossary] : libraryGlossary;
}

export function stripDemoFiles(files: UploadedFile[]): UploadedFile[] {
  return files.filter((f) => !isDemoFile(f));
}
