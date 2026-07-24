import { cn } from '../../utils/cn';

/** Thin mastery/progress track — mockup-dense (4px). */
export function CompactProgressBar({
  pct,
  color = 'var(--color-brand-600)',
  className,
  'aria-label': ariaLabel,
}: {
  pct: number;
  color?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-surface-hover', className)}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}
