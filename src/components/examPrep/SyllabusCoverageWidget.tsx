import { useMemo } from 'react';
import { Calendar, CheckSquare, CheckCircle2 } from '@/lib/lucide-shim';
import type { Course } from '../../types';
import {
  buildSyllabusCoverageSnapshot,
  pickPrimaryCourseForCoverage,
  type TopicCoverageRow,
} from '../../lib/examPrep/syllabusCoverageTracker';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import { PlatformSection } from '../ui/primitives';

type Props = {
  courses: Course[];
  settingsExamDate?: string;
  daysToExam?: number | null;
  reviewsDue?: number;
  onSelectCourse?: (course: Course) => void;
  onPracticeTopic?: (topic: TopicCoverageRow, courseId: string) => void;
  /** Compact rail / paired layout (mockup Wave I). */
  compact?: boolean;
};

export function SyllabusCoverageWidget({
  courses,
  settingsExamDate,
  onSelectCourse,
  onPracticeTopic,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const primary = useMemo(() => pickPrimaryCourseForCoverage(courses), [courses]);
  const snapshot = useMemo(
    () => (primary ? buildSyllabusCoverageSnapshot(primary, settingsExamDate) : null),
    [primary, settingsExamDate],
  );

  if (!snapshot || snapshot.totalTopics === 0) return null;

  if (compact) {
    const pct = Math.round(snapshot.coveragePct);
    return (
      <div
        className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2"
        data-testid="syllabus-coverage-widget-compact"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            {t('coverageTrackerTitle')}
          </p>
          {onSelectCourse && primary && (
            <button
              type="button"
              onClick={() => onSelectCourse(primary)}
              className="text-[10px] font-medium text-brand-700 hover:text-brand-600"
            >
              {t('coverageTrackerOpenCourse')}
            </button>
          )}
        </div>
        <p className="text-xs font-medium text-text-primary truncate">{snapshot.courseTitle}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums text-text-primary">{pct}%</span>
          <span className="text-[10px] text-text-muted">
            {snapshot.completedTopics}/{snapshot.totalTopics}
          </span>
        </div>
        {/* Wave P-2 C08 — coverage compact progress track uses --viz-bar-track
            for ≥3:1 contrast vs card surface in every theme. */}
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
          <div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-1 max-h-28 overflow-y-auto">
          {snapshot.topics.slice(0, 6).map((topic) => (
            /* OPT-K9b — Practice sits beside title (proximity), not far-right justify */
            <li key={topic.topicId} className="coverage-topic-row flex items-center gap-1.5 text-[10px]">
              {topic.isComplete ? (
                <CheckCircle2 className="w-3 h-3 text-accent-emerald shrink-0" aria-hidden />
              ) : (
                /* Wave P-2 C10 — pending-topic bullet now filled with --viz-bar-track
                    so it stays visible in warm-light / spectrum where the raw
                    border-subtle stroke collapsed to invisible on tinted cards. */
                <span
                  className="w-3 h-3 rounded-full border border-border-default shrink-0"
                  style={{ backgroundColor: 'var(--viz-bar-track)' }}
                  aria-hidden
                />
              )}
              <span className={cn('coverage-topic-title', topic.isComplete ? 'text-text-secondary' : 'text-text-primary')}>
                {topic.title}
              </span>
              {!topic.isComplete && onPracticeTopic && primary && (
                <button
                  type="button"
                  onClick={() => onPracticeTopic(topic, primary.id)}
                  className="coverage-topic-action text-brand-700 font-medium"
                >
                  {t('coveragePracticeTopic')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

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

        {/* Wave P-2 C08 — full-panel coverage progress track uses --viz-bar-track. */}
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
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
              className="coverage-topic-row flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1.5 bg-surface-card/50"
            >
              {topic.isComplete && <CheckCircle2 className="w-3 h-3 text-accent-emerald shrink-0" />}
              <span className={cn('coverage-topic-title', topic.isComplete && 'text-accent-emerald')}>
                {topic.title}
              </span>
              <span className="shrink-0 text-text-muted tabular-nums">
                {topic.completedLessons}/{topic.totalLessons}
              </span>
              {!topic.isComplete && onPracticeTopic && primary && (
                <button
                  type="button"
                  data-testid={`coverage-practice-${topic.topicId}`}
                  onClick={() => onPracticeTopic(topic, snapshot.courseId)}
                  className="coverage-topic-action text-brand-700 font-medium hover:underline"
                >
                  {t('coveragePracticeTopic')}
                </button>
              )}
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
