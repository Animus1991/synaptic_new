import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, ArrowRight } from '@/lib/lucide-shim';
import { EXAM_CALENDAR_FEED } from '../lib/examPrep/examCalendarFeed';
import {
  mergeStudentOrgCalendar,
  type StudentAssignmentDue,
  type StudentCalendarFilter,
} from '../lib/studentOrgCalendar';
import type { StudentOrgContent } from '../lib/studentOrgContent';
import { assignmentStatusLabel, assignmentStatusTone } from '../lib/studentOrgModel';
import { formatShortDate } from '../lib/localeFormat';
import { useI18n } from '../lib/i18n';
import { cn } from '../utils/cn';

type Props = {
  assignments: StudentAssignmentDue[];
  ui: StudentOrgContent;
  lang: 'en' | 'el';
};

const statusToneClass: Record<ReturnType<typeof assignmentStatusTone>, string> = {
  positive: 'bg-accent-emerald/15 text-accent-emerald',
  warning: 'bg-accent-amber/15 text-accent-amber',
  neutral: 'bg-surface-hover text-text-secondary',
  negative: 'bg-accent-rose/15 text-accent-rose',
};

export function StudentOrgCalendarPanel({ assignments, ui, lang }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<StudentCalendarFilter>('all');

  const entries = useMemo(
    () =>
      mergeStudentOrgCalendar(
        assignments,
        EXAM_CALENDAR_FEED,
        (entry) => ({
          title: t(entry.titleKey as never),
          body: t(entry.bodyKey as never),
          linkLabel: entry.linkLabelKey ? t(entry.linkLabelKey as never) : undefined,
        }),
        filter,
      ),
    [assignments, filter, t],
  );

  return (
    <section className="rounded-panel border border-border-subtle bg-surface-card/40" data-testid="student-org-calendar">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-lg font-medium">
          <Calendar className="w-5 h-5 text-brand-600" />
          {ui.calendarTitle}
        </span>
        <ChevronDown className={cn('w-5 h-5 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle/50 pt-3">
          <p className="text-sm text-text-muted">{ui.calendarHint}</p>

          <div className="flex flex-wrap gap-2">
            {(['all', 'assignments', 'exams'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                data-testid={`student-calendar-filter-${preset}`}
                onClick={() => setFilter(preset)}
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-medium border transition-colors',
                  filter === preset
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-600'
                    : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
                )}
              >
                {preset === 'all'
                  ? ui.calendarFilterAll
                  : preset === 'assignments'
                    ? ui.calendarFilterAssignments
                    : ui.calendarFilterExams}
              </button>
            ))}
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-text-muted">{ui.calendarEmpty}</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border-subtle/60 bg-surface-card/60 p-3 text-sm"
                  data-testid={`student-calendar-entry-${entry.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-text-muted">
                          {formatShortDate(entry.date, lang)}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full',
                            entry.kind === 'exam'
                              ? 'bg-brand-600/10 text-brand-800'
                              : 'bg-surface-hover text-text-secondary',
                          )}
                        >
                          {entry.kind === 'exam' ? ui.calendarKindExam : ui.calendarKindAssignment}
                        </span>
                      </div>
                      <p className="font-medium text-text-primary">{entry.title}</p>
                      {entry.subtitle && (
                        <p className="text-xs text-text-secondary line-clamp-2">{entry.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.score != null && (
                        <span className="text-xs font-medium">{entry.score}%</span>
                      )}
                      {entry.status && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full capitalize',
                            statusToneClass[assignmentStatusTone(entry.status)],
                          )}
                        >
                          {assignmentStatusLabel(entry.status, lang)}
                        </span>
                      )}
                      {entry.linkUrl && entry.linkLabel && (
                        <a
                          href={entry.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-brand-600 hover:underline"
                        >
                          {entry.linkLabel}
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
