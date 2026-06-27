import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WhiteboardBlueprintCoverageReport } from '../../lib/whiteboardBlueprintCoverageQA';
import { blueprintContextHint, blueprintKindLabel } from '../../lib/whiteboardBlueprintCoverageQA';

type Props = {
  report: WhiteboardBlueprintCoverageReport;
  lang: 'en' | 'el';
};

export function WhiteboardBlueprintCoverageStrip({ report, lang }: Props) {
  const isEl = lang === 'el';
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;
  const contextHint = blueprintContextHint(report.contextEdge, lang);

  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[10px] space-y-1',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="whiteboard-blueprint-coverage-strip"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          {report.bannerSummary
            ?? (isEl ? 'Blueprint coverage' : 'Blueprint coverage')}
          {' · '}
          <span className="font-medium">{blueprintKindLabel(report.activeKind, lang)}</span>
        </span>
      </div>
      {contextHint && (
        <p className="text-[9px] opacity-90 pl-5">{contextHint}</p>
      )}
    </div>
  );
}
