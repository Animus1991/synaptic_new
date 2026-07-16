import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';

/** Source-quality chip from mockup (score / 100). */
export function QualityScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { t } = useI18n();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strong = clamped >= 75;
  const weak = clamped < 50;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold',
        strong && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
        weak && 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
        !strong && !weak && 'border-border-subtle bg-surface-primary/60 text-text-secondary',
        className,
      )}
      data-testid="quality-score-badge"
    >
      {strong
        ? t('qualityScoreStrong').replace('{score}', String(clamped))
        : weak
          ? t('qualityScoreNeedsMaterial').replace('{score}', String(clamped))
          : t('qualityScoreNeutral').replace('{score}', String(clamped))}
    </span>
  );
}
