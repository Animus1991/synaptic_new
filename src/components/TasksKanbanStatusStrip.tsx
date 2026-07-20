import { cn } from '../utils/cn';
import type { Task } from '../types';
import { useI18n, type I18nKey } from '../lib/i18n';
import { AllCapsLabel } from './ui/AllCapsLabel';

type ColumnId = 'drafts' | 'active' | 'ready' | 'done';

const COLUMNS: { id: ColumnId; labelKey: I18nKey }[] = [
  { id: 'drafts', labelKey: 'tasksKanbanDrafts' },
  { id: 'active', labelKey: 'tasksKanbanActive' },
  { id: 'ready', labelKey: 'tasksKanbanReady' },
  { id: 'done', labelKey: 'tasksKanbanDone' },
];

function columnCounts(
  tasks: Task[],
  activeTaskId: string | null | undefined,
  sessionQueueIds: string[],
  doneCount: number,
): Record<ColumnId, number> {
  const activeId = activeTaskId ?? null;
  const queued = new Set(sessionQueueIds);
  let drafts = 0;
  let active = 0;
  let ready = 0;

  for (const task of tasks) {
    if (task.status === 'completed') continue;
    const isActive = task.status === 'in-progress' || task.id === activeId;
    if (isActive) {
      active += 1;
      continue;
    }
    if (task.status === 'pending' && queued.has(task.id) && task.id !== activeId) {
      ready += 1;
      continue;
    }
    if (task.status === 'pending') {
      drafts += 1;
    }
  }

  return { drafts, active, ready, done: doneCount };
}

/** Decorative Kanban column strip — Replit task-board rhythm (Wave R3). */
export function TasksKanbanStatusStrip({
  tasks,
  activeTaskId,
  sessionQueueIds,
  doneCount,
  className,
}: {
  tasks: Task[];
  activeTaskId?: string | null;
  sessionQueueIds: string[];
  doneCount: number;
  className?: string;
}) {
  const { t } = useI18n();
  const counts = columnCounts(tasks, activeTaskId, sessionQueueIds, doneCount);

  return (
    <div
      className={cn('tasks-kanban-strip grid grid-cols-2 sm:grid-cols-4 gap-2', className)}
      data-testid="tasks-kanban-strip"
      aria-hidden
    >
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className={cn('tasks-kanban-column', col.id === 'active' && counts.active > 0 && 'tasks-kanban-column-accent')}
        >
          <p className="tasks-kanban-column-label"><AllCapsLabel>{t(col.labelKey)}</AllCapsLabel></p>
          <p className="tasks-kanban-column-count">{counts[col.id]}</p>
        </div>
      ))}
    </div>
  );
}

export function tasksKanbanCardStatus(task: Task, activeTaskId?: string | null): ColumnId {
  if (task.status === 'completed') return 'done';
  if (task.status === 'in-progress' || task.id === activeTaskId) return 'active';
  return 'drafts';
}
