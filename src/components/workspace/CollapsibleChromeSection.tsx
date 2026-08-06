/**
 * Collapsible secondary chrome for Primer-minimal density (OPT-M2).
 * Outside minimal themes, children render unchanged — no functionality loss.
 */
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

type Props = {
  title: string;
  children: ReactNode;
  /** When true, section starts expanded even on minimal. Default collapsed. */
  defaultOpen?: boolean;
  /**
   * Collapse on every theme (not only Primer-minimal). Use for tool chrome that
   * must stay out of the way (Wave E5 filters / queues).
   */
  alwaysCollapse?: boolean;
  className?: string;
  'data-testid'?: string;
};

export function CollapsibleChromeSection({
  title,
  children,
  defaultOpen = false,
  alwaysCollapse = false,
  className,
  'data-testid': testId = 'collapsible-chrome-section',
}: Props) {
  const minimal = useMinimalTheme();
  const [open, setOpen] = useState(defaultOpen);

  if (!alwaysCollapse && !minimal) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn('collapsible-chrome-section shrink-0 border-b border-border-default bg-surface-primary', className)}
      data-testid={testId}
      data-minimal-chrome="true"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
      </button>
      {open ? (
        <div className="collapsible-chrome-section-body" data-testid={`${testId}-body`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
