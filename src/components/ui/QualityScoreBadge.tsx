import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

/** Source-quality chip from mockup (score / 100). */
export function QualityScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { t } = useI18n();
  const soft = useMinimalTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strong = clamped >= 75;
  const weak = clamped < 50;
  return (
    <span
      className={cn(
        'ux-status-badge inline-flex items-center rounded-md border px-1.5 py-0.5 type-micro font-semibold',
        soft
          ? 'border-transparent bg-surface-secondary text-text-primary'
          : strong
            ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
            : weak
              ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
              : 'border-border-subtle bg-surface-primary/60 text-text-secondary',
        className,
      )}
      data-testid="quality-score-badge"
      data-quality={strong ? 'strong' : weak ? 'weak' : 'neutral'}
      data-soft={soft ? 'true' : undefined}
    >
      {strong
        ? t('qualityScoreStrong').replace('{score}', String(clamped))
        : weak
          ? t('qualityScoreNeedsMaterial').replace('{score}', String(clamped))
          : t('qualityScoreNeutral').replace('{score}', String(clamped))}
    </span>
  );
}
