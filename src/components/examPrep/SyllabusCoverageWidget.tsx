import { useMemo } from 'react';
import { Calendar, CheckSquare, CheckCircle2 } from '@/lib/lucide-shim';
import type { Course } from '../../types';
import {
  buildSyllabusCoverageSnapshot,
  pickPrimaryCourseForCoverage,
} from '../../lib/examPrep/syllabusCoverageTracker';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import { PlatformSection } from '../ui/primitives';

type Props = {
  courses: Course[];
  settingsExamDate?: string;
  onSelectCourse?: (course: Course) => void;
};

export function SyllabusCoverageWidget({ courses, settingsExamDate, onSelectCourse }: Props) {
  const { t } = useI18n();
  const primary = useMemo(() => pickPrimaryCourseForCoverage(courses), [courses]);
  const snapshot = useMemo(
    () => (primary ? buildSyllabusCoverageSnapshot(primary, settingsExamDate) : null),
    [primary, settingsExamDate],
  );

  if (!snapshot || snapshot.totalTopics === 0) return null;

  return (
    <div data-testid="syllabus-coverage-widget">
    <PlatformSection
      tone="brand"
      title={t('coverageTrackerTitle')}
      icon={CheckSquare}
      iconClassName="text-brand-600"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-text-primary">{snapshot.courseTitle}</span>
          {snapshot.daysToExam !== null ? (
            <span className="inline-flex items-center gap-1 ws-chip-warn rounded-full px-2 py-0.5 font-medium">
              <Calendar className="w-3 h-3" />
              {snapshot.daysToExam === 0
                ? t('coverageTrackerExamToday')
                : t('coverageTrackerDaysToExam').replace('{n}', String(snapshot.daysToExam))}
            </span>
          ) : (
            <span className="text-text-muted">{t('coverageTrackerNoExamDate')}</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label={t('coverageTrackerCoverage')} value={`${snapshot.coveragePct}%`} />
          <Stat
            label={t('coverageTrackerRemainingTopics')}
            value={String(snapshot.remainingTopics)}
          />
          <Stat
            label={t('coverageTrackerCompletedTopics')}
            value={`${snapshot.completedTopics}/${snapshot.totalTopics}`}
          />
          <Stat
            label={t('coverageTrackerLessons')}
            value={`${snapshot.completedLessons}/${snapshot.totalLessons}`}
          />
        </div>

        <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${snapshot.coveragePct}%` }}
            data-testid="coverage-progress-bar"
          />
        </div>

        <p className="text-[11px] text-text-muted">{t('coverageTrackerPracticeNote')}</p>

        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
          {snapshot.topics.map((topic) => (
            <li
              key={topic.topicId}
              className="flex items-center justify-between gap-2 text-[11px] rounded-lg px-2 py-1.5 bg-surface-card/50"
            >
              <span className={cn('truncate', topic.isComplete && 'text-accent-emerald')}>
                {topic.title}
              </span>
              <span className="shrink-0 text-text-muted flex items-center gap-1">
                {topic.isComplete && <CheckCircle2 className="w-3 h-3 text-accent-emerald" />}
                {topic.completedLessons}/{topic.totalLessons}
              </span>
            </li>
          ))}
        </ul>

        {primary && onSelectCourse && (
          <button
            type="button"
            onClick={() => onSelectCourse(primary)}
            className="text-xs text-brand-700 font-medium hover:underline"
            data-testid="coverage-open-course"
          >
            {t('coverageTrackerOpenCourse')}
          </button>
        )}
      </div>
    </PlatformSection>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card/40 px-3 py-2">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
