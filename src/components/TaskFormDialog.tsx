import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';
import type { Task } from '../types';
import type { Lang } from '../lib/i18n';
import { getTasksContent } from '../lib/tasksContent';
import {
  createManualTask,
  PERSONAL_COURSE,
  resolveManualTaskCourse,
  updateManualTask,
  type ManualTaskCourse,
} from '../lib/personalTask';
import { Button } from './ui/Button';
import { FocusTrapDialog } from './ui/FocusTrapDialog';
import { ModalHeaderStack } from './ui/ModalHeaderStack';

const fieldClass =
  'w-full min-h-9 rounded-lg border-0 bg-surface-secondary/55 px-3 py-2 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35';

const CATEGORIES: Task['category'][] = ['learn', 'review', 'practice', 'exam', 'fix'];
const PRIORITIES: Task['priority'][] = ['low', 'medium', 'high', 'critical'];

function dueDateInputValue(iso?: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso.slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

function dueDateToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `${trimmed}T12:00:00.000Z`;
}

type Props = {
  open: boolean;
  lang: Lang;
  courses: ManualTaskCourse[];
  defaultCourseId?: string | null;
  editing?: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
};

export function TaskFormDialog({
  open,
  lang,
  courses,
  defaultCourseId,
  editing,
  onClose,
  onSave,
}: Props) {
  const c = getTasksContent(lang);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState(defaultCourseId ?? '');
  const [category, setCategory] = useState<Task['category']>('learn');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [minutes, setMinutes] = useState('15');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setCourseId(editing.courseId);
      setCategory(editing.category);
      setPriority(editing.priority);
      setMinutes(String(editing.estimatedMinutes));
      setDueDate(dueDateInputValue(editing.dueAt));
    } else {
      setTitle('');
      setDescription('');
      setCourseId(defaultCourseId ?? courses[0]?.id ?? PERSONAL_COURSE.id);
      setCategory('learn');
      setPriority('medium');
      setMinutes('15');
      setDueDate('');
    }
    setError(null);
  }, [open, editing, defaultCourseId, courses]);

  const handleSave = () => {
    if (!title.trim()) {
      setError(c.taskTitleRequired);
      return;
    }
    const course = resolveManualTaskCourse(courses, courseId);
    const draft = {
      title,
      description,
      course: course.id === PERSONAL_COURSE.id ? { ...course, title: c.taskPersonalCourse } : course,
      category,
      priority,
      estimatedMinutes: Number(minutes) || 15,
      dueAt: dueDateToIso(dueDate),
    };
    onSave(editing ? updateManualTask(editing, draft) : createManualTask(draft));
    onClose();
  };

  return (
    <FocusTrapDialog
      open={open}
      onClose={onClose}
      title={editing ? c.editTaskTitle : c.addTaskTitle}
      hideHeader
      size="md"
      zIndex={160}
      align="bottom-mobile"
      data-testid="task-form-dialog"
      bodyClassName="p-0"
    >
      <div className="relative flex items-start justify-between gap-3 p-5 border-b border-border-subtle">
        <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border-subtle sm:hidden" aria-hidden />
        <ModalHeaderStack
          eyebrow={c.addTaskEyebrow}
          title={editing ? c.editTaskTitle : c.addTaskTitle}
          titleId="task-form-title"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={c.taskCancel}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          <X className="w-5 h-5 text-text-secondary" aria-hidden />
        </button>
      </div>
      <div className="space-y-3 p-5">
        <label className="block space-y-1">
          <span className="type-caption text-text-secondary">{c.taskTitleLabel}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="task-form-title"
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="type-caption text-text-secondary">{c.taskDescriptionLabel}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            data-testid="task-form-description"
            className={`${fieldClass} resize-y`}
          />
        </label>
        <label className="block space-y-1">
          <span className="type-caption text-text-secondary">{c.taskCourseLabel}</span>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            data-testid="task-form-course"
            className={fieldClass}
          >
            {courses.length === 0 && (
              <option value={PERSONAL_COURSE.id}>{c.taskPersonalCourse}</option>
            )}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="type-caption text-text-secondary">{c.taskCategoryLabel}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Task['category'])}
              data-testid="task-form-category"
              className={fieldClass}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value === 'learn'
                    ? lang === 'el' ? 'Μάθηση' : 'Learn'
                    : value === 'review'
                      ? lang === 'el' ? 'Επανάληψη' : 'Review'
                      : value === 'practice'
                        ? lang === 'el' ? 'Εξάσκηση' : 'Practice'
                        : value === 'exam'
                          ? lang === 'el' ? 'Εξέταση' : 'Exam'
                          : lang === 'el' ? 'Διόρθωση' : 'Fix'}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="type-caption text-text-secondary">{c.taskPriorityLabel}</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              data-testid="task-form-priority"
              className={fieldClass}
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value === 'low'
                    ? c.priorityLow
                    : value === 'medium'
                      ? c.priorityMedium
                      : value === 'high'
                        ? c.priorityHigh
                        : c.priorityCritical}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="type-caption text-text-secondary">{c.taskMinutesLabel}</span>
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              data-testid="task-form-minutes"
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="type-caption text-text-secondary">{c.taskDueLabel}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="task-form-due"
              className={fieldClass}
            />
          </label>
        </div>
        {error && (
          <p className="type-micro text-accent-rose" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {c.taskCancel}
        </Button>
        <Button variant="primary" onClick={handleSave} data-testid="task-form-save">
          {c.taskSave}
        </Button>
      </div>
    </FocusTrapDialog>
  );
}
