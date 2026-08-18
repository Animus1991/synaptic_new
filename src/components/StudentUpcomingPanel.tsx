import type { StudentDashboard } from '../lib/studentDashboardClient';
import type { StudentOrgContent } from '../lib/studentOrgContent';
import { assignmentStatusLabel, assignmentStatusTone } from '../lib/studentOrgModel';
import { formatShortDate } from '../lib/localeFormat';
import { cn } from '../utils/cn';

type Props = {
  upcoming: StudentDashboard['upcoming'];
  ui: StudentOrgContent;
  lang: 'en' | 'el';
  onOpenAssignment?: (classId: string, assignmentId: string) => void;
};

const toneClass: Record<ReturnType<typeof assignmentStatusTone>, string> = {
  positive: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
  warning: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  neutral: 'bg-surface-hover text-text-secondary border-border-subtle',
  negative: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
};

export function StudentUpcomingPanel({ upcoming, ui, lang, onOpenAssignment }: Props) {
  if (upcoming.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="student-upcoming">
      <h2 className="text-lg font-medium">{ui.upcomingTitle}</h2>
      <p className="type-body text-text-muted">{ui.upcomingHint}</p>
      <ul className="rounded-xl border border-border-subtle divide-y divide-border-subtle/50 overflow-hidden">
        {upcoming.map((row) => {
          const clickable = Boolean(onOpenAssignment);
          const inner = (
            <>
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">{row.title}</p>
                <p className="type-caption text-text-muted truncate">
                  {row.className}
                  {row.dueAt ? ` · ${formatShortDate(row.dueAt, lang)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {row.score != null && (
                  <span className="type-caption font-medium text-text-primary">{row.score}%</span>
                )}
                <span
                  className={cn(
                    'type-micro px-2 py-0.5 rounded-full border capitalize',
                    toneClass[assignmentStatusTone(row.status)],
                  )}
                >
                  {assignmentStatusLabel(row.status, lang)}
                </span>
              </div>
            </>
          );
          return (
            <li key={`${row.classId}-${row.assignmentId}`}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onOpenAssignment?.(row.classId, row.assignmentId)}
                  data-testid={`student-upcoming-open-${row.assignmentId}`}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface-card/40 type-body text-left hover:bg-surface-hover/50"
                >
                  {inner}
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface-card/40 type-body">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

