import { cn } from '../../utils/cn';
import type { FeynmanRubricExportDiscoverabilityReport } from '../../lib/feynmanRubricExportDiscoverabilityQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: FeynmanRubricExportDiscoverabilityReport;
  lang: 'en' | 'el';
  onExportDownload?: () => void;
  onExportPrint?: () => void;
  onOpenDashboard?: () => void;
};

/** OPT-K160 — text-first status strip; wash actions (no decorative Lucide). */
export function FeynmanRubricExportDiscoverabilityStrip({
  report,
  lang: _lang,
  onExportDownload,
  onExportPrint,
  onOpenDashboard,
}: Props) {
  const { t } = useI18n();
  if (!report.bannerSummary) return null;

  const ready = report.exportReady;

  return (
    <div
      className={cn(
        'ws-status-strip mb-2 flex flex-col gap-2 border-0 bg-surface-secondary/35 sm:flex-row sm:items-center',
        ready ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="feynman-rubric-export-discoverability-strip"
      data-clarity-pass="k162"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <p className="min-w-0 leading-snug">{report.bannerSummary}</p>
      </div>

      {ready && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {onExportDownload && (
            <button
              type="button"
              data-testid="feynman-strip-export-download"
              onClick={onExportDownload}
              className="inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              HTML
            </button>
          )}
          {onExportPrint && (
            <button
              type="button"
              data-testid="feynman-strip-export-print"
              onClick={onExportPrint}
              className="inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              PDF
            </button>
          )}
          {onOpenDashboard && (
            <button
              type="button"
              data-testid="feynman-strip-open-dashboard"
              onClick={onOpenDashboard}
              className="inline-flex min-h-8 items-center rounded-lg border-0 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {t('stripDashboardExport')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
