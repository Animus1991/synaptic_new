import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { QuizSelectionRemediationReport } from '../../lib/quizSelectionRemediationQA';

type Props = {
  report: QuizSelectionRemediationReport;
  lang: 'en' | 'el';
};

export function QuizSelectionContractStrip({ report, lang }: Props) {
  const isEl = lang === 'el';
  const Icon = report.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]',
        report.ok
          ? 'border-accent-emerald/25 bg-accent-emerald/5 text-accent-emerald'
          : 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber',
      )}
      data-testid="quiz-selection-contract-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        {report.ok
          ? (isEl
            ? `§13.5 — ${report.selectionActionCount} ενέργειες · remediation ${report.wrongItemCount > 0 ? `(${report.wrongItemCount} λάθη)` : 'έτοιμο'}`
            : `§13.5 — ${report.selectionActionCount} actions · remediation ${report.wrongItemCount > 0 ? `(${report.wrongItemCount} mistakes)` : 'ready'}`)
          : (isEl
            ? `§13.5 — ${report.issues.length} θέμα(τα) ελέγχου`
            : `§13.5 — ${report.issues.length} contract check issue(s)`)}
      </p>
    </div>
  );
}
