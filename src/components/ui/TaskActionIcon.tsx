import { cn } from '../../utils/cn';
import type { Task, TaskType } from '../../types';
import { getTaskActionVisual, getTaskTypeVisual } from '../../lib/taskActionIcons';

type Size = 'xs' | 'sm' | 'md';

const sizeClass: Record<Size, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

type Props = {
  task?: Task;
  taskType?: TaskType;
  size?: Size;
  className?: string;
};

/** Phosphor thin icon for a task row or palette entry. */
export function TaskActionIcon({ task, taskType, size = 'xs', className }: Props) {
  const visual = task
    ? getTaskActionVisual(task)
    : taskType
      ? getTaskTypeVisual(taskType)
      : getTaskTypeVisual('lesson');
  const Icon = visual.icon;
  return (
    <Icon
      className={cn(sizeClass[size], 'shrink-0', visual.colorClass, className)}
      aria-hidden
    />
  );
}
