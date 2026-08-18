import { cn } from '../../utils/cn';

/** Thin mastery/progress track — mockup-dense (`sm` 4px, `md` 6px). */
export function CompactProgressBar({
  pct,
  color = 'var(--color-brand-600)',
  className,
  size = 'sm',
  'aria-label': ariaLabel,
}: {
  pct: number;
  color?: string;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={cn(
        size === 'md' ? 'h-1.5' : 'h-1',
        'w-full overflow-hidden rounded-full',
        className,
      )}
      style={{ backgroundColor: 'var(--viz-bar-track)' }}
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
