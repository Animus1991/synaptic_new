import { useMemo, useState } from 'react';
import { ArrowRight } from '@/lib/lucide-shim';
import type { Course, PersonalStudyDate, Task } from '../../types';
import type { StudentAssignmentDue } from '../../lib/studentOrgCalendar';
import { EXAM_CALENDAR_FEED, filterExamCalendar } from '../../lib/examPrep/examCalendarFeed';
import { buildUserExamCalendar, type UserExamSource } from '../../lib/examPrep/userExamCalendar';
import { useI18n } from '../../lib/i18n';
import { PlatformSection } from '../ui/primitives';

type PresetFilter = 'all' | 'mine' | 'official';

type Props = {
  settingsExamDate?: string;
  courses?: readonly Course[];
  tasks?: readonly Task[];
  personalStudyDates?: readonly PersonalStudyDate[];
  orgAssignments?: readonly StudentAssignmentDue[];
};

function sourceLabelKey(source: UserExamSource): 'examCalendarSourceSettings' | 'examCalendarSourceCourse' | 'examCalendarSourceTask' | 'examCalendarSourcePersonal' | 'examCalendarSourceOrg' {
  if (source === 'settings') return 'examCalendarSourceSettings';
  if (source === 'course') return 'examCalendarSourceCourse';
  if (source === 'task') return 'examCalendarSourceTask';
  if (source === 'personal') return 'examCalendarSourcePersonal';
  return 'examCalendarSourceOrg';
}

export function ExamCalendarPanel({
  settingsExamDate,
  courses = [],
  tasks = [],
  personalStudyDates = [],
  orgAssignments = [],
}: Props) {
  const { t, lang } = useI18n();
  const [preset, setPreset] = useState<PresetFilter>('all');
  const userEntries = useMemo(
    () => buildUserExamCalendar({
      settingsExamDate,
      courses,
      tasks,
      personalStudyDates,
      orgAssignments,
      lang,
    }),
    [settingsExamDate, courses, tasks, personalStudyDates, orgAssignments, lang],
  );
  const official = useMemo(() => filterExamCalendar(EXAM_CALENDAR_FEED, 'all'), []);
  const showMine = preset === 'all' || preset === 'mine';
  const showOfficial = preset === 'all' || preset === 'official';
  const empty = (showMine ? userEntries.length : 0) + (showOfficial ? official.length : 0) === 0;

  return (
    <div id="exam-calendar-panel" data-testid="exam-calendar-panel">
    <PlatformSection
      tone="muted"
      title={t('examCalendarTitle')}
      className="border-0 shadow-none bg-transparent"
      padding="sm"
    >
      {/* OPT-K110 — frameless filter cluster (active = wash, not outline pill) */}
      <div
        className="exam-calendar-filter-row mb-2 inline-flex flex-wrap gap-1 rounded-lg bg-surface-secondary/55 p-0.5"
        role="group"
        aria-label={t('examCalendarTitle')}
      >
        {(['all', 'mine', 'official'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            data-testid={`exam-calendar-filter-${p}`}
            className={`rounded-md px-3 py-1 type-micro font-medium border-0 transition-colors ${
              preset === p
                ? 'bg-surface-primary text-text-primary'
                : 'bg-transparent text-text-secondary hover:bg-surface-hover/60'
            }`}
          >
            {p === 'all'
              ? t('examCalendarFilterAll')
              : p === 'mine'
                ? t('examCalendarFilterMine')
                : t('examCalendarFilterOfficial')}
          </button>
        ))}
      </div>

      {/* OPT-K115 — spacing stack (no row hairlines) */}
      <ul className="proximity-track-wide flex flex-col gap-2">
        {empty && (
          <li className="type-caption text-text-tertiary py-0.5" data-testid="exam-calendar-empty">
            {t('examCalendarEmpty')}
          </li>
        )}
        {showMine && userEntries.map((entry) => (
          <li key={entry.id} className="min-w-0" data-testid={`exam-calendar-entry-${entry.id}`}>
            <div className="proximity-row items-start">
              <div className="proximity-row-label min-w-0">
                <p className="type-micro text-text-muted mb-1">{entry.date} · {t(sourceLabelKey(entry.source))}</p>
                <p className="type-meta font-semibold text-text-primary">{entry.title}</p>
                <p className="type-body text-text-secondary mt-1">{entry.body}</p>
              </div>
            </div>
          </li>
        ))}
        {showOfficial && official.map((entry) => (
          <li
            key={entry.id}
            className="min-w-0"
            data-testid={`exam-calendar-entry-${entry.id}`}
          >
            <div className="proximity-row items-start">
              <div className="proximity-row-label min-w-0">
                <p className="type-micro text-text-muted mb-1">{entry.date} · {t('examCalendarOfficialHeading')}</p>
                <p className="type-meta font-semibold text-text-primary">{t(entry.titleKey as never)}</p>
                <p className="type-body text-text-secondary mt-1">{t(entry.bodyKey as never)}</p>
              </div>
              {entry.linkUrl && entry.linkLabelKey && (
                <a
                  href={entry.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 type-micro text-text-primary hover:underline"
                >
                  {t(entry.linkLabelKey as never)}
                  <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PlatformSection>
    </div>
  );
}
