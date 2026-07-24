import type { KeyboardEventHandler, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** OPT-K5 — Cursor Spending-like label ↔ value row (weight hierarchy, thin chrome). */
export function UtilityRow({
  label,
  value,
  hint,
  icon,
  barPct,
  onClick,
  className,
  'data-testid': dataTestId,
}: {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** 0–100; when set, renders a UsageBar under the row. */
  barPct?: number;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}) {
  const clickable = Boolean(onClick);
  const onKeyDown: KeyboardEventHandler<HTMLDivElement> | undefined = clickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }
    : undefined;

  return (
    <div
      className={cn('utility-row', clickable && 'utility-row--interactive', className)}
      data-testid={dataTestId}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className="utility-row-main">
        <div className="utility-row-label">
          {icon && <span className="utility-row-icon" aria-hidden>{icon}</span>}
          <span className="utility-row-label-text">{label}</span>
        </div>
        {value != null && value !== '' && (
          <span className="utility-row-value">{value}</span>
        )}
      </div>
      {hint != null && hint !== '' && (
        <p className="utility-row-hint">{hint}</p>
      )}
      {typeof barPct === 'number' && Number.isFinite(barPct) && (
        <UsageBar pct={barPct} className="mt-1.5" aria-label={typeof label === 'string' ? label : undefined} />
      )}
    </div>
  );
}

/** OPT-K5 — thin progress track (Cursor Spending usage bar). */
export function UsageBar({
  pct,
  className,
  'aria-label': ariaLabel,
}: {
  pct: number;
  className?: string;
  'aria-label'?: string;
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={cn('usage-bar', className)}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className="usage-bar-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

/** OPT-K6 — titled section well for hub stacks (not competing cards). */
export function HubSection({
  title,
  children,
  className,
  'data-testid': dataTestId,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <section className={cn('hub-section', className)} data-testid={dataTestId}>
      {title != null && title !== '' && (
        <h2 className="hub-section-title">{title}</h2>
      )}
      <div className="hub-section-body">{children}</div>
    </section>
  );
}
