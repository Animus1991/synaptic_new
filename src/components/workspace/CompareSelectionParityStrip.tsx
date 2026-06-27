import type { CompareReaderSelectionParityReport } from '../../lib/compareReaderSelectionParityQA';
import { WorkspaceQaStatusStrip } from './WorkspaceQaStatusStrip';

type Props = {
  report: CompareReaderSelectionParityReport;
  lang: 'en' | 'el';
};

export function CompareSelectionParityStrip({ report, lang }: Props) {
  if (report.rowCount === 0) return null;

  const isEl = lang === 'el';
  const contractIssues = report.issues.filter((i) => i.code !== 'ocr-noisy-row');

  return (
    <WorkspaceQaStatusStrip ok={report.ok} testId="compare-selection-parity-strip">
      {report.bannerSummary ?? (isEl ? 'Σύγκριση με Reader' : 'Reader parity')}
      {report.ocrRiskRowCount > 0 && (
        <span className="opacity-90">
          {' · '}
          {isEl
            ? `${report.ocrRiskRowCount} σειρ${report.ocrRiskRowCount === 1 ? 'ά' : 'ές'} OCR`
            : `${report.ocrRiskRowCount} OCR row${report.ocrRiskRowCount === 1 ? '' : 's'}`}
        </span>
      )}
      {!report.ok && contractIssues.length > 0 && (
        <span className="opacity-90">
          {' · '}
          {isEl ? `${contractIssues.length} θέμα(τα)` : `${contractIssues.length} issue(s)`}
        </span>
      )}
    </WorkspaceQaStatusStrip>
  );
}
