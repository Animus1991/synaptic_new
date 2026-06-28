import { CheckCircle2, Download, FileText, Printer } from '@/lib/lucide-shim';
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
        'ws-status-strip mb-3 flex flex-col gap-2 sm:flex-row sm:items-center',
        ready ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="feynman-rubric-export-discoverability-strip"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {ready ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <p className="min-w-0 leading-snug">{report.bannerSummary}</p>
      </div>

      {ready && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {onExportDownload && (
            <button
              type="button"
              data-testid="feynman-strip-export-download"
              onClick={onExportDownload}
              className="ws-chip-brand inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium hover:opacity-90"
            >
              <Download className="h-3 w-3" />
              HTML
            </button>
          )}
          {onExportPrint && (
            <button
              type="button"
              data-testid="feynman-strip-export-print"
              onClick={onExportPrint}
              className="ws-chip-brand inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium hover:opacity-90"
            >
              <Printer className="h-3 w-3" />
              PDF
            </button>
          )}
          {onOpenDashboard && (
            <button
              type="button"
              data-testid="feynman-strip-open-dashboard"
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary"
            >
              {t('stripDashboardExport')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
