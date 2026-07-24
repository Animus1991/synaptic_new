import { CheckCircle2, AlertTriangle, XCircle } from '@/lib/lucide-shim';
import type { CourseQualityReport } from '../lib/courseQualityGates';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { cn } from '../utils/cn';

const GATE_LABEL_KEYS = {
  coverage: 'qualityGateCoverage',
  grounding: 'qualityGateGrounding',
  ordering: 'qualityGateOrdering',
  assessment: 'qualityGateAssessment',
  readability: 'qualityGateReadability',
  determinism: 'qualityGateDeterminism',
} as const;

type Props = {
  report: CourseQualityReport;
  lang: Lang;
  compact?: boolean;
  className?: string;
};

export function QualityReportPanel({ report, lang, compact = false, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        report.passes
          ? 'border-accent-emerald/25 bg-accent-emerald/5'
          : 'border-accent-amber/30 bg-accent-amber/8',
        className,
      )}
      data-testid="course-quality-report"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-text-primary">{t('qualityReportTitle', lang)}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {report.passes ? t('qualityReportPassed', lang) : t('qualityReportNeedsReview', lang)}
          </p>
        </div>
        <span className="text-xs font-semibold text-text-muted">
          {report.overallScore}/100
        </span>
      </div>

      <div className={cn('mt-3 grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        {report.gates.map((gate) => {
          const Icon = gate.pass ? CheckCircle2 : gate.score >= 40 ? AlertTriangle : XCircle;
          return (
            <div
              key={gate.id}
              className="flex items-start gap-2 rounded-xl border border-white/8 bg-surface-primary/35 px-3 py-2"
              data-testid={`quality-gate-${gate.id}`}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  gate.pass ? 'text-accent-emerald' : 'text-accent-amber',
                )}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-text-primary">
                  {t(GATE_LABEL_KEYS[gate.id], lang)}
                </p>
                <p className="text-[10px] text-text-muted truncate">{gate.detail}</p>
              </div>
              <span className="ml-auto text-[10px] text-text-tertiary">{gate.score}</span>
            </div>
          );
        })}
      </div>

      {report.recommendations.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-text-secondary list-disc pl-4">
          {report.recommendations.map((rec) => (
            <li key={rec}>{rec}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
