import { cn } from '../../utils/cn';
import type { DebateRebuttalPersistReport } from '../../lib/debateRebuttalGraphPersistQA';
import { debatePersistEdgeLabel } from '../../lib/debateRebuttalGraphPersistQA';

type Props = {
  report: DebateRebuttalPersistReport;
  lang: 'en' | 'el';
};

/** OPT-K158 — text-first warn wash (no outline / decorative icon). */
export function DebateRebuttalPersistStrip({ report, lang }: Props) {
  /* Wave DB — status strip only when something needs attention */
  if (report.edgeKind === 'empty-tree' || report.ok) return null;

  return (
    <div
      className={cn(
        'ws-status-strip flex items-center border-b border-transparent px-3 py-1.5',
        'ws-status-warn',
      )}
      data-testid="debate-rebuttal-persist-strip"
      data-clarity-pass="k158"
    >
      <span className="min-w-0 flex-1 type-caption">
        {report.bannerSummary ?? debatePersistEdgeLabel(report.edgeKind, lang)}
      </span>
    </div>
  );
}
