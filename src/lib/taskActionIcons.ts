/**
 * Package 2 — canonical task / action icons (Phosphor via lucide-shim).
 * Use for Tasks list, Command palette, Dashboard priority rows.
 */

import type { Task, TaskType } from '../types';
import type { LucideIcon } from '@/lib/lucide-shim';
import {
  AlertTriangle,
  ArrowDownRight,
  BookOpen,
  Bot,
  Brain,
  Code,
  GitCompare,
  GraduationCap,
  Layout,
  Lightbulb,
  MessageSquare,
  Mic,
  RotateCcw,
  Sparkles,
  Timer,
} from '@/lib/lucide-shim';
import { getTaskAction, type TaskAction } from './taskFlows';

export type TaskVisual = {
  icon: LucideIcon;
  colorClass: string;
};

export const TASK_ACTION_VISUAL: Record<TaskAction, TaskVisual> = {
  lesson: { icon: BookOpen, colorClass: 'text-brand-600' },
  practical: { icon: Code, colorClass: 'text-accent-teal' },
  workspace: { icon: Layout, colorClass: 'text-accent-violet' },
  agent: { icon: Bot, colorClass: 'text-accent-cyan' },
  'tasks-review': { icon: RotateCcw, colorClass: 'text-accent-violet' },
  'tasks-fix': { icon: AlertTriangle, colorClass: 'text-accent-orange' },
  'tasks-prereq': { icon: ArrowDownRight, colorClass: 'text-accent-orange' },
  'exam-prep': { icon: GraduationCap, colorClass: 'text-accent-rose' },
};

/** Per task.type — finer-grained than action (Tasks page labels). */
export const TASK_TYPE_VISUAL: Record<TaskType, TaskVisual> = {
  lesson: TASK_ACTION_VISUAL.lesson,
  quiz: { icon: Brain, colorClass: 'text-accent-cyan' },
  review: TASK_ACTION_VISUAL['tasks-review'],
  practice: TASK_ACTION_VISUAL.practical,
  'exam-prep': TASK_ACTION_VISUAL['exam-prep'],
  flashcards: { icon: Sparkles, colorClass: 'text-accent-emerald' },
  'mistake-retry': TASK_ACTION_VISUAL['tasks-fix'],
  'concept-check': { icon: Lightbulb, colorClass: 'text-accent-amber' },
  'deep-dive': { icon: MessageSquare, colorClass: 'text-accent-cyan' },
  'timed-test': { icon: Timer, colorClass: 'text-accent-rose' },
  'self-explanation': { icon: MessageSquare, colorClass: 'text-accent-violet' },
  comparison: { icon: GitCompare, colorClass: 'text-accent-teal' },
  'prerequisite-repair': TASK_ACTION_VISUAL['tasks-prereq'],
  'oral-exam': { icon: Mic, colorClass: 'text-accent-rose' },
};

export function getTaskActionVisual(task: Task): TaskVisual {
  return TASK_ACTION_VISUAL[getTaskAction(task)];
}

export function getTaskTypeVisual(type: TaskType): TaskVisual {
  return TASK_TYPE_VISUAL[type];
}
