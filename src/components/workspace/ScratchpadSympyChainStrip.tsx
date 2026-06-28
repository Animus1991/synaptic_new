import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ScratchpadSympyChainReport } from '../../lib/scratchpadSympyChainEdgeCasesQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  report: ScratchpadSympyChainReport;
  lang: 'en' | 'el';
};

export function ScratchpadSympyChainStrip({ report, lang: _lang }: Props) {
  const { t } = useI18n();
  if (!report.bannerSummary && report.parseableCount === 0) return null;

  const Icon = report.ok && (report.invalidStepCount === 0) ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'ws-status-strip flex items-center gap-2',
        report.ok && report.invalidStepCount === 0 ? 'ws-status-ok' : 'ws-status-warn',
      )}
      data-testid="scratchpad-sympy-chain-strip"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {report.bannerSummary
          ? (t('stripChainPrefix').replace('{summary}', report.bannerSummary ?? ''))
          : (t('stripAddStepsValidate'))}
      </span>
    </div>
  );
}
