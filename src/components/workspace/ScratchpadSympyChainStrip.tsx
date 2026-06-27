import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ScratchpadSympyChainReport } from '../../lib/scratchpadSympyChainEdgeCasesQA';

type Props = {
  report: ScratchpadSympyChainReport;
  lang: 'en' | 'el';
};

export function ScratchpadSympyChainStrip({ report, lang }: Props) {
  const isEl = lang === 'el';
  if (!report.bannerSummary && report.parseableCount === 0) return null;

  const Icon = report.ok && (report.invalidStepCount === 0) ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[10px] flex items-center gap-2',
        report.ok && report.invalidStepCount === 0
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="scratchpad-sympy-chain-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {report.bannerSummary
          ? (isEl ? `Αλυσίδα — ${report.bannerSummary}` : `Chain — ${report.bannerSummary}`)
          : (isEl ? 'Πρόσθεσε βήματα για επικύρωση' : 'Add steps to validate')}
      </span>
    </div>
  );
}
