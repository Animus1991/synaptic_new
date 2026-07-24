import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { SimulatorTimerPresetSyncReport } from '../../lib/simulatorTimerPresetSyncQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: SimulatorTimerPresetSyncReport;
  lang: 'en' | 'el';
};

export function SimulatorTimerPresetSyncStrip({ report, lang: _lang }: Props) {
  const { t } = useI18n();
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'ws-status-strip mb-3 flex items-center gap-2',
        report.ok ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="simulator-timer-preset-sync-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        {report.bannerSummary
          ?? (t('stripSimTimerSync'))}
        {!report.syncOk && (
          <span className="opacity-90">
            {' · '}
            {t('stripPresetCheck')}
          </span>
        )}
      </p>
    </div>
  );
}
