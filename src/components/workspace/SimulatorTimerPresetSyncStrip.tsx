import { cn } from '../../utils/cn';
import type { SimulatorTimerPresetSyncReport } from '../../lib/simulatorTimerPresetSyncQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: SimulatorTimerPresetSyncReport;
  lang: 'en' | 'el';
};

export function SimulatorTimerPresetSyncStrip({ report, lang: _lang }: Props) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'ws-status-strip flex items-center border-0',
        report.ok ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="simulator-timer-preset-sync-strip"
      data-clarity-pass="k159"
    >
      <p className="min-w-0 flex-1 type-caption leading-snug">
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
