import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Dense section label used across Dashboard / Library / Tasks / Analytics.
 * OPT-K121 — platform type rhythm (type-micro ink).
 * OPT-K166 — sentence-case text-first (no ALL-CAPS / decorative icon required).
 */
export function SectionLabel({
  icon: Icon,
  children,
  action,
  className,
  headingLevel,
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /**
   * When set, exposes the label to assistive tech as a heading at this level
   * (visual styling is unchanged). Opt-in so nested/decorative labels can stay
   * out of the heading outline while section titles join it.
   */
  headingLevel?: 2 | 3 | 4;
}) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />}
        <p
          className="ux-section-label-title truncate type-micro font-semibold text-text-secondary"
          {...(headingLevel ? { role: 'heading', 'aria-level': headingLevel } : {})}
        >
          {children}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
