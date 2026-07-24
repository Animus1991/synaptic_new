import type { CompareReaderSelectionParityReport } from '../../lib/compareReaderSelectionParityQA';
import { WorkspaceQaStatusStrip } from './WorkspaceQaStatusStrip';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: CompareReaderSelectionParityReport;
};

export function CompareSelectionParityStrip({ report }: Props) {
  if (report.rowCount === 0) return null;

  const { t } = useI18n();
  const contractIssues = report.issues.filter((i) => i.code !== 'ocr-noisy-row');
  const ocrLabel = report.ocrRiskRowCount > 0
    ? (report.ocrRiskRowCount === 1
      ? t('stripOcrRowOne')
      : t('stripOcrRows').replace('{count}', String(report.ocrRiskRowCount)))
    : null;

  return (
    <WorkspaceQaStatusStrip ok={report.ok} testId="compare-selection-parity-strip">
      {report.bannerSummary ?? (t('stripReaderParity'))}
      {ocrLabel && (
        <span className="opacity-90">
          {' · '}
          {ocrLabel}
        </span>
      )}
      {!report.ok && contractIssues.length > 0 && (
        <span className="opacity-90">
          {' · '}
          {t('stripIssueCount').replace('{count}', String(contractIssues.length))}
        </span>
      )}
    </WorkspaceQaStatusStrip>
  );
}
