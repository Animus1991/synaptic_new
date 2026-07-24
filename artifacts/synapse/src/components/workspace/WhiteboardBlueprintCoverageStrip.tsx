import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WhiteboardBlueprintCoverageReport } from '../../lib/whiteboardBlueprintCoverageQA';
import { blueprintContextHint, blueprintKindLabel } from '../../lib/whiteboardBlueprintCoverageQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: WhiteboardBlueprintCoverageReport;
  lang: 'en' | 'el';
};

export function WhiteboardBlueprintCoverageStrip({ report, lang }: Props) {
  const { t } = useI18n();
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;
  const contextHint = blueprintContextHint(report.contextEdge, lang);

  return (
    <div
      className={cn(
        'ws-status-strip rounded-lg space-y-1',
        report.ok ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="whiteboard-blueprint-coverage-strip"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          {report.bannerSummary
            ?? (t('stripBlueprintCoverage'))}
          {' · '}
          <span className="font-medium">{blueprintKindLabel(report.activeKind, lang)}</span>
        </span>
      </div>
      {contextHint && (
        <p className="text-[10px] opacity-90 pl-5">{contextHint}</p>
      )}
    </div>
  );
}
