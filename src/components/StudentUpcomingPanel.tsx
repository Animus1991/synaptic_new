import type { StudentDashboard } from '../lib/studentDashboardClient';
import type { StudentOrgContent } from '../lib/studentOrgContent';
import { assignmentStatusLabel, assignmentStatusTone } from '../lib/studentOrgModel';
import { formatShortDate } from '../lib/localeFormat';
import { cn } from '../utils/cn';

type Props = {
  upcoming: StudentDashboard['upcoming'];
  ui: StudentOrgContent;
  lang: 'en' | 'el';
};

const toneClass: Record<ReturnType<typeof assignmentStatusTone>, string> = {
  positive: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
  warning: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  neutral: 'bg-surface-hover text-text-secondary border-border',
  negative: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
};

export function StudentUpcomingPanel({ upcoming, ui, lang }: Props) {
  if (upcoming.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="student-upcoming">
      <h2 className="text-lg font-medium">{ui.upcomingTitle}</h2>
      <p className="text-sm text-text-muted">{ui.upcomingHint}</p>
      <ul className="rounded-xl border border-border divide-y divide-border/50 overflow-hidden">
        {upcoming.map((row) => (
          <li
            key={`${row.classId}-${row.assignmentId}`}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface/40 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-text-primary truncate">{row.title}</p>
              <p className="text-xs text-text-muted truncate">
                {row.className}
                {row.dueAt ? ` · ${formatShortDate(row.dueAt, lang)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.score != null && (
                <span className="text-xs font-medium text-text-primary">{row.score}%</span>
              )}
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border capitalize',
                  toneClass[assignmentStatusTone(row.status)],
                )}
              >
                {assignmentStatusLabel(row.status, lang)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
