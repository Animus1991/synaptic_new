import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import { asAllCapsLabel } from '../../lib/greekTypography';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export type CourseStatusKind =
  | 'ready'
  | 'in_progress'
  | 'generating'
  | 'needs_review'
  | 'medium'
  | 'complete';

const KIND_CLASS: Record<CourseStatusKind, string> = {
  ready: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25',
  in_progress: 'bg-surface-secondary text-text-primary border border-border-subtle border-brand-500/25',
  generating: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/25',
  needs_review: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  medium: 'bg-accent-teal/10 text-accent-teal border-accent-teal/25',
  complete: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25',
};

/** OPT-K103/K110 — Canon soft chips: wash + ink (no outline cage). */
const KIND_CLASS_SOFT: Record<CourseStatusKind, string> = {
  ready: 'bg-surface-secondary text-text-primary border-transparent',
  in_progress: 'bg-surface-secondary text-text-primary border-transparent',
  generating: 'bg-surface-secondary text-text-secondary border-transparent',
  needs_review: 'bg-surface-secondary text-text-primary border-transparent',
  medium: 'bg-surface-secondary text-text-secondary border-transparent',
  complete: 'bg-surface-secondary text-text-primary border-transparent',
};

const KIND_KEY = {
  ready: 'courseStatusReady',
  in_progress: 'courseStatusInProgress',
  generating: 'courseStatusGenerating',
  needs_review: 'courseStatusNeedsReview',
  medium: 'courseStatusMedium',
  complete: 'courseStatusComplete',
} as const;

export function CourseStatusBadge({
  kind,
  className,
  label,
}: {
  kind: CourseStatusKind;
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const soft = useMinimalTheme();
  return (
    <span
      className={cn(
        'ux-status-badge inline-flex items-center rounded-md border px-1.5 py-0.5 type-micro font-semibold uppercase tracking-wide',
        /* OPT-K110 — soft mode: wash only */
        soft ? cn('border-transparent', KIND_CLASS_SOFT[kind]) : KIND_CLASS[kind],
        className,
      )}
      data-testid={`course-status-${kind}`}
      data-kind={kind}
      data-soft={soft ? 'true' : undefined}
    >
      {asAllCapsLabel(label ?? t(KIND_KEY[kind]))}
    </span>
  );
}
