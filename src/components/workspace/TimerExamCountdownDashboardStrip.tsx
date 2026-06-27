import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { TimerExamCountdownDashboardReport } from '../../lib/timerExamCountdownDashboardQA';

type Props = {
  report: TimerExamCountdownDashboardReport;
  lang: 'en' | 'el';
};

export function TimerExamCountdownDashboardStrip({ report, lang }: Props) {
  const isEl = lang === 'el';
  const Icon = report.syncOk ? CheckCircle2 : AlertTriangle;

  if (report.dashboardDays === null && report.timerDays === null) {
    return null;
  }

  return (
    <div
      className={cn(
        'ws-status-strip mb-3 flex items-center gap-2',
        report.syncOk ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="timer-exam-countdown-dashboard-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        {report.bannerSummary
          ?? (isEl ? 'Dashboard ↔ Timer αντίστροφη' : 'Dashboard ↔ Timer countdown')}
        {!report.syncOk && (
          <span className="opacity-90">
            {' · '}
            {isEl ? 'έλεγχος ημερομηνίας' : 'date check'}
          </span>
        )}
      </p>
    </div>
  );
}
