import type { StudentDashboard } from '../lib/studentDashboardClient';
import type { StudentOrgContent } from '../lib/studentOrgContent';
import { cn } from '../utils/cn';

type Props = {
  dashboard: StudentDashboard;
  ui: StudentOrgContent;
};

export function StudentOrgSummary({ dashboard, ui }: Props) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      data-testid="student-org-summary"
    >
      <div className="rounded-xl border border-border bg-surface/60 p-3">
        <p className="text-[10px] text-text-muted">{ui.statClasses}</p>
        <p className="text-lg font-semibold text-text-primary">{dashboard.classCount}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface/60 p-3">
        <p className="text-[10px] text-text-muted">{ui.statAvgScore}</p>
        <p className="text-lg font-semibold text-text-primary">
          {dashboard.avgScore != null ? `${Math.round(dashboard.avgScore)}%` : '—'}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface/60 p-3">
        <p className="text-[10px] text-text-muted">{ui.statCompletion}</p>
        <p className="text-lg font-semibold text-text-primary">
          {dashboard.completionRate != null
            ? `${Math.round(dashboard.completionRate * 100)}%`
            : '—'}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface/60 p-3">
        <p className="text-[10px] text-text-muted">{ui.statOverdue}</p>
        <p
          className={cn(
            'text-lg font-semibold',
            dashboard.overdueCount > 0 ? 'text-accent-rose' : 'text-text-primary',
          )}
        >
          {dashboard.overdueCount}
        </p>
      </div>
    </div>
  );
}
