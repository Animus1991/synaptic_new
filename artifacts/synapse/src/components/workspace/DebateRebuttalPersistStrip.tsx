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
        'ws-status-strip mx-4 mb-2 flex items-center gap-2',
        report.ok ? 'ws-status-ok' : 'ws-status-warn',
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
