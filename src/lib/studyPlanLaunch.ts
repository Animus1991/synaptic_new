import type { Task } from '../types';
import type { SessionType } from './taskFlows';

export type StudyPlanKind = 'mistakes' | 'reviews' | 'weak';
export type StudyPlanTab = 'today' | 'weak' | 'reviews' | 'mistakes';

export type StudyPlanLaunchBlock = {
  kind?: StudyPlanKind;
  label: string;
  items: string[];
  taskIds?: string[];
};

export type StudyPlanLaunch = {
  kind: StudyPlanKind | 'today';
  tab: StudyPlanTab;
  session: SessionType;
  taskIds: string[];
};

type LaunchTask = Pick<Task, 'id' | 'title' | 'status' | 'category' | 'type' | 'isSpacedRepetition' | 'priority'>;

export function studyPlanKindFromLabel(label: string): StudyPlanKind | 'today' {
  const l = label.toLowerCase();
  if (l.includes('mistake') || l.includes('λάθ') || l.includes('λαθ')) return 'mistakes';
  if (l.includes('review') || l.includes('επαναλ') || l.includes('επανάλη')) return 'reviews';
  if (l.includes('weak') || l.includes('αδύναμ')) return 'weak';
  return 'today';
}

export function sessionForStudyPlanKind(kind: StudyPlanKind | 'today'): SessionType {
  if (kind === 'reviews') return 'review';
  if (kind === 'mistakes') return '10min';
  return '25min';
}

function kindPredicate(kind: StudyPlanKind | 'today'): (task: LaunchTask) => boolean {
  switch (kind) {
    case 'mistakes':
      return (task) => task.category === 'fix' || task.type === 'mistake-retry';
    case 'reviews':
      return (task) => Boolean(task.isSpacedRepetition) || task.category === 'review';
    case 'weak':
      return (task) => task.category === 'learn' || task.priority === 'high' || task.priority === 'critical';
    default:
      return (task) => task.status === 'pending';
  }
}

function pending(tasks: readonly LaunchTask[]): LaunchTask[] {
  return tasks.filter((task) => task.status !== 'completed');
}

/** Resolve tab, session type, and the queue those chips should start. */
export function resolveStudyPlanLaunch(
  block: StudyPlanLaunchBlock,
  tasks: readonly LaunchTask[],
): StudyPlanLaunch {
  const kind = block.kind ?? studyPlanKindFromLabel(block.label);
  const tab: StudyPlanTab = kind === 'today' ? 'today' : kind;
  const session = sessionForStudyPlanKind(kind);
  const open = pending(tasks);

  const fromIds = (block.taskIds ?? [])
    .map((id) => open.find((task) => task.id === id))
    .filter((task): task is LaunchTask => Boolean(task));
  if (fromIds.length > 0) {
    return { kind, tab, session, taskIds: fromIds.map((task) => task.id) };
  }

  const fromTitles = block.items
    .map((title) => open.find((task) => task.title === title))
    .filter((task): task is LaunchTask => Boolean(task));
  if (fromTitles.length > 0) {
    return { kind, tab, session, taskIds: fromTitles.map((task) => task.id) };
  }

  return {
    kind,
    tab,
    session,
    taskIds: open.filter(kindPredicate(kind)).map((task) => task.id),
  };
}
