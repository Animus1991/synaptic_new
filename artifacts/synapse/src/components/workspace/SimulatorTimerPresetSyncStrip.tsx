import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { SimulatorTimerPresetSyncReport } from '../../lib/simulatorTimerPresetSyncQA';

type Props = {
  report: SimulatorTimerPresetSyncReport;
  lang: 'en' | 'el';
};

export function SimulatorTimerPresetSyncStrip({ report, lang }: Props) {
  const isEl = lang === 'el';
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="simulator-timer-preset-sync-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        {report.bannerSummary
          ?? (isEl ? 'Simulator ↔ Timer sync' : 'Simulator ↔ Timer sync')}
        {!report.syncOk && (
          <span className="opacity-90">
            {' · '}
            {isEl ? 'έλεγχος preset' : 'preset check'}
          </span>
        )}
      </p>
    </div>
  );
}
