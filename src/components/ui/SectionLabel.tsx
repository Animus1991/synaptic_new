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
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />}
        <p className="ux-section-label-title truncate type-micro font-semibold text-text-secondary">
          {children}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
