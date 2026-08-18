import { Calendar, GraduationCap, Play } from '@/lib/lucide-shim';
import type { Course, Task } from '../types';
import { t, type Lang } from '../lib/i18n';
import { Page, PageHeader, PrimaryCTA, SecondaryCTA } from './ui/primitives';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { ExamCalendarPanel } from './examPrep/ExamCalendarPanel';
import { SyllabusCoverageWidget } from './examPrep/SyllabusCoverageWidget';
import type { TopicCoverageRow } from '../lib/examPrep/syllabusCoverageTracker';
import { TaskActionIcon } from './ui/TaskActionIcon';

function isExamTask(task: Task): boolean {
  return (
    task.category === 'exam'
    || task.type === 'exam-prep'
    || task.type === 'timed-test'
    || task.type === 'oral-exam'
  );
}

type Props = {
  lang: Lang;
  courses: Course[];
  tasks: Task[];
  settingsExamDate?: string;
  daysToExam?: number | null;
  onStartTask: (taskId: string) => void;
  onOpenExamTasks: () => void;
  onSelectCourse?: (course: Course) => void;
  onPracticeTopic?: (topic: TopicCoverageRow, courseId: string) => void;
};

export function ExamPrepPage({
  lang,
  courses,
  tasks,
  settingsExamDate,
  daysToExam = null,
  onStartTask,
  onOpenExamTasks,
  onSelectCourse,
  onPracticeTopic,
}: Props) {
  const examTasks = tasks.filter((task) => isExamTask(task) && task.status !== 'completed');
  const primary = examTasks[0] ?? null;
  const countdown =
    daysToExam === null
      ? t('examPrepPageNoDate', lang)
      : daysToExam === 0
        ? t('examPrepPageExamToday', lang)
        : t('examPrepPageExamInDays', lang).replace('{count}', String(daysToExam));

  return (
    <Page
      gap="sm"
      data-testid="exam-prep-page"
      data-type-rhythm="dashboard"
      data-border-diet="cta-only"
      data-bleed="full"
    >
      <PageHeader
        icon={GraduationCap}
        title={t('examPrepPageTitle', lang)}
        subtitle={t('examPrepPageSubtitle', lang)}
        actions={
          <div className="flex flex-wrap gap-2">
            <SecondaryCTA type="button" size="sm" onClick={onOpenExamTasks} data-testid="exam-prep-open-tasks">
              <Calendar className="w-3.5 h-3.5" />
              {t('examPrepPageOpenTasks', lang)}
            </SecondaryCTA>
            <PrimaryCTA
              type="button"
              size="sm"
              disabled={!primary}
              onClick={() => primary && onStartTask(primary.id)}
              data-testid="exam-prep-start"
            >
              <Play className="w-3.5 h-3.5" />
              {t('examPrepPageStart', lang)}
            </PrimaryCTA>
          </div>
        }
      />

      <p className="type-caption text-text-secondary" data-testid="exam-prep-countdown">
        {countdown}
      </p>

      {examTasks.length === 0 ? (
        <PlatformEmptyState
          title={t('examPrepPageEmptyTitle', lang)}
          description={t('examPrepPageEmptyBody', lang)}
          icon={null}
        />
      ) : (
        <ul className="space-y-2" data-testid="exam-prep-task-list">
          {examTasks.map((task) => (
            <li key={task.id} className="ux-card flex items-center gap-3 p-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0">
                <TaskActionIcon task={task} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="type-body font-medium text-text-primary truncate">{task.title}</p>
                <p className="type-caption text-text-tertiary">
                  {task.courseName} · {t('examPrepPageTaskMinutes', lang).replace('{minutes}', String(task.estimatedMinutes))}
                </p>
              </div>
              <SecondaryCTA
                type="button"
                size="sm"
                onClick={() => onStartTask(task.id)}
                data-testid={`exam-prep-start-${task.id}`}
                className="shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                {t('examPrepPageStart', lang)}
              </SecondaryCTA>
            </li>
          ))}
        </ul>
      )}

      <SyllabusCoverageWidget
        courses={courses}
        settingsExamDate={settingsExamDate}
        daysToExam={daysToExam}
        onSelectCourse={onSelectCourse}
        onPracticeTopic={onPracticeTopic}
      />

      <ExamCalendarPanel
        settingsExamDate={settingsExamDate}
        courses={courses}
        tasks={tasks}
      />
    </Page>
  );
}
