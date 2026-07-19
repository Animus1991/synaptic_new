import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';

export type CourseStatusKind =
  | 'ready'
  | 'in_progress'
  | 'generating'
  | 'needs_review'
  | 'medium'
  | 'complete';

const KIND_CLASS: Record<CourseStatusKind, string> = {
  ready: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25',
  in_progress: 'bg-brand-600/10 text-brand-800 border-brand-500/25',
  generating: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/25',
  needs_review: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  medium: 'bg-accent-teal/10 text-accent-teal border-accent-teal/25',
  complete: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25',
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
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
        KIND_CLASS[kind],
        className,
      )}
      data-testid={`course-status-${kind}`}
    >
      {label ?? t(KIND_KEY[kind])}
    </span>
  );
}
