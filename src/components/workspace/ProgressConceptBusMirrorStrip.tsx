import { Download } from '@/lib/lucide-shim';
import { t, type Lang } from '../../lib/i18n';
import type { ProgressConceptBusMirrorReport } from '../../lib/progressConceptBusMirrorQA';
import { WorkspaceQaStatusStrip } from './WorkspaceQaStatusStrip';

type Props = {
  report: ProgressConceptBusMirrorReport;
  lang: Lang;
  onExportHtml?: () => void;
};

export function ProgressConceptBusMirrorStrip({ report, lang, onExportHtml }: Props) {
  if (!report.bannerSummary) return null;

  return (
    <WorkspaceQaStatusStrip
      ok={report.ok}
      testId="progress-concept-bus-mirror-strip"
      trailing={
        <>
          {onExportHtml && report.exportIncludesBus && (
            <button
              type="button"
              data-testid="progress-mirror-export-html"
              onClick={onExportHtml}
              className="ws-chip-brand inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium"
            >
              <Download className="h-3 w-3" />
              HTML
            </button>
          )}
          {!report.ok && (
            <span className="shrink-0 text-[10px] opacity-90">{t('checkLabel', lang)}</span>
          )}
        </>
      }
    >
      {report.bannerSummary}
    </WorkspaceQaStatusStrip>
  );
}
