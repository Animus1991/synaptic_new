import type { Task, UserSettings } from '../types';
import type { Lang } from './i18n';
import { getTaskConcept } from './taskFlows';
import { lessonStepCount } from './settingsEffects';
import {
  lessonStepLabel,
  quizForConcept,
  workspaceStepsForConcept,
  type LessonStepDef,
  type LessonStepKey,
  type QuizDef,
} from './domainContent';

export type { LessonStepDef, LessonStepKey, QuizDef };

const ALL_STEP_KEYS: LessonStepKey[] = [
  'intro', 'explanation', 'example', 'misconception', 'practice', 'quiz', 'summary',
];

const SHORT_STEP_KEYS: LessonStepKey[] = [
  'intro', 'explanation', 'practice', 'quiz', 'summary',
];

export function buildLessonSteps(settings?: UserSettings): LessonStepDef[] {
  const lang: Lang = settings?.language ?? 'en';
  const count = settings ? lessonStepCount(settings) : 7;
  const keys = count <= 5 ? SHORT_STEP_KEYS : ALL_STEP_KEYS;
  return keys.map((key) => ({ key, label: lessonStepLabel(key, lang) }));
}

export function lessonKeyFromTask(task: Task | null | undefined, fallback = 'default-lesson'): string {
  if (!task) return fallback;
  return `lesson:${task.id}`;
}

export function workspaceLessonKey(task: Task | null | undefined): string {
  if (!task) return 'workspace:market-structures';
  return `workspace:${task.id}`;
}

export function buildQuizForConcept(concept: string, lang?: Lang): QuizDef {
  return quizForConcept(concept, lang ?? 'en');
}

export function practiceAnswerForConcept(concept: string): number {
  const c = concept.toLowerCase();
  if (c.includes('bertrand') || c.includes('cournot') || c.includes('oligopoly')) return 10;
  if (c.includes('elastic')) return -1.5;
  return 10;
}

export function buildWorkspaceSteps(concept: string, lang?: Lang): { title: string; type: string }[] {
  return workspaceStepsForConcept(concept, lang ?? 'en');
}

export function getLessonTitle(task: Task | null | undefined, concept: string): string {
  if (task?.title) return getTaskConcept(task);
  return concept;
}
