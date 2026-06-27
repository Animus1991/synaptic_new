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
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]',
        report.syncOk
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
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
