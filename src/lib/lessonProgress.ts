import { loadJson, saveJson } from './persistence';

const KEY = 'lesson-progress';

type LessonProgressRecord = {
  step: number;
  practicePassed?: boolean;
  quizPassed?: boolean;
  completedAt?: string;
};

type Store = Record<string, LessonProgressRecord>;

function load(): Store {
  return loadJson<Store>(KEY, {});
}

export function getLessonProgress(lessonKey: string): LessonProgressRecord | null {
  return load()[lessonKey] ?? null;
}

export function saveLessonProgress(lessonKey: string, patch: Partial<LessonProgressRecord>): LessonProgressRecord {
  const store = load();
  const next: LessonProgressRecord = { step: 0, ...store[lessonKey], ...patch };
  store[lessonKey] = next;
  saveJson(KEY, store);
  return next;
}

export function clearLessonProgress(lessonKey: string): void {
  const store = load();
  delete store[lessonKey];
  saveJson(KEY, store);
}
