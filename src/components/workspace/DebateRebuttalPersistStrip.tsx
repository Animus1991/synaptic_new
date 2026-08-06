import { AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { DebateRebuttalPersistReport } from '../../lib/debateRebuttalGraphPersistQA';
import { debatePersistEdgeLabel } from '../../lib/debateRebuttalGraphPersistQA';

type Props = {
  report: DebateRebuttalPersistReport;
  lang: 'en' | 'el';
};

export function DebateRebuttalPersistStrip({ report, lang }: Props) {
  /* Wave DB — status strip only when something needs attention */
  if (report.edgeKind === 'empty-tree' || report.ok) return null;

  return (
    <div
      className={cn('ws-status-strip flex items-center gap-2 border-b border-border-subtle px-3 py-1.5', 'ws-status-warn')}
      data-testid="debate-rebuttal-persist-strip"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {report.bannerSummary ?? debatePersistEdgeLabel(report.edgeKind, lang)}
      </span>
    </div>
  );
}
