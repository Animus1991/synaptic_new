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
  const contextHint = blueprintContextHint(report.contextEdge, lang);

  return (
    <div
      className={cn(
        'ws-status-strip rounded-md space-y-1 border-0',
        report.ok ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="whiteboard-blueprint-coverage-strip"
      data-clarity-pass="k157"
    >
      <div className="min-w-0">
        <span className="type-caption">
          {report.bannerSummary
            ?? (t('stripBlueprintCoverage'))}
          {' · '}
          <span className="font-medium">{blueprintKindLabel(report.activeKind, lang)}</span>
        </span>
      </div>
      {contextHint && (
        <p className="type-caption opacity-90">{contextHint}</p>
      )}
    </div>
  );
}
