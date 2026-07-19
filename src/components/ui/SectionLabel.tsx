import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Dense uppercase section label used across Dashboard / Library / Tasks / Analytics. */
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
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />}
        <p className="ux-section-label-title truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
          {children}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
