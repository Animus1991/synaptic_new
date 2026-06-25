import { CheckCircle2, Download, FileText, Printer } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { FeynmanRubricExportDiscoverabilityReport } from '../../lib/feynmanRubricExportDiscoverabilityQA';

type Props = {
  report: FeynmanRubricExportDiscoverabilityReport;
  lang: 'en' | 'el';
  onExportDownload?: () => void;
  onExportPrint?: () => void;
  onOpenDashboard?: () => void;
};

export function FeynmanRubricExportDiscoverabilityStrip({
  report,
  lang,
  onExportDownload,
  onExportPrint,
  onOpenDashboard,
}: Props) {
  const isEl = lang === 'el';
  if (!report.bannerSummary) return null;

  const ready = report.exportReady;

  return (
    <div
      className={cn(
        'mb-3 flex flex-col gap-2 rounded-xl border px-3 py-2 text-[10px] sm:flex-row sm:items-center',
        ready
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-brand-500/25 bg-brand-500/5 text-brand-300',
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
              className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/35 bg-accent-emerald/10 px-2 py-1 text-[10px] font-medium text-accent-emerald hover:bg-accent-emerald/15"
            >
              <Download className="h-3 w-3" />
              {isEl ? 'HTML' : 'HTML'}
            </button>
          )}
          {onExportPrint && (
            <button
              type="button"
              data-testid="feynman-strip-export-print"
              onClick={onExportPrint}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/25 px-2 py-1 text-[10px] font-medium text-accent-emerald hover:bg-accent-emerald/10"
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
              {isEl ? 'Dashboard export' : 'Dashboard export'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
