import { CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ProgressConceptBusMirrorReport } from '../../lib/progressConceptBusMirrorQA';

type Props = {
  report: ProgressConceptBusMirrorReport;
  lang: 'en' | 'el';
  onExportHtml?: () => void;
};

export function ProgressConceptBusMirrorStrip({ report, lang, onExportHtml }: Props) {
  const isEl = lang === 'el';
  if (!report.bannerSummary) return null;

  const Icon = report.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="progress-concept-bus-mirror-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{report.bannerSummary}</p>
      {onExportHtml && report.exportIncludesBus && (
        <button
          type="button"
          data-testid="progress-mirror-export-html"
          onClick={onExportHtml}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent-emerald/35 bg-accent-emerald/10 px-2 py-1 text-[10px] font-medium hover:bg-accent-emerald/15"
        >
          <Download className="h-3 w-3" />
          HTML
        </button>
      )}
      {!report.ok && (
        <span className="shrink-0 opacity-90">
          {isEl ? 'mirror QA' : 'mirror QA'}
        </span>
      )}
    </div>
  );
}
