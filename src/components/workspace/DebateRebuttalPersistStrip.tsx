import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { DebateRebuttalPersistReport } from '../../lib/debateRebuttalGraphPersistQA';
import { debatePersistEdgeLabel } from '../../lib/debateRebuttalGraphPersistQA';

type Props = {
  report: DebateRebuttalPersistReport;
  lang: 'en' | 'el';
};

export function DebateRebuttalPersistStrip({ report, lang }: Props) {
  if (report.edgeKind === 'empty-tree') return null;

  const Icon = report.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'mx-4 mb-2 rounded-lg border px-2.5 py-1.5 text-[10px] flex items-center gap-2',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="debate-rebuttal-persist-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {report.bannerSummary ?? debatePersistEdgeLabel(report.edgeKind, lang)}
      </span>
    </div>
  );
}
