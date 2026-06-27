import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { CompareReaderSelectionParityReport } from '../../lib/compareReaderSelectionParityQA';

type Props = {
  report: CompareReaderSelectionParityReport;
  lang: 'en' | 'el';
};

export function CompareSelectionParityStrip({ report, lang }: Props) {
  if (report.rowCount === 0) return null;

  const isEl = lang === 'el';
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;
  const contractIssues = report.issues.filter((i) => i.code !== 'ocr-noisy-row');

  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="compare-selection-parity-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        {report.bannerSummary
          ?? (isEl ? '§13.5 Reader parity' : '§13.5 Reader parity')}
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
            {isEl
              ? `${contractIssues.length} θέμα(τα)`
              : `${contractIssues.length} issue(s)`}
          </span>
        )}
      </p>
    </div>
  );
}
