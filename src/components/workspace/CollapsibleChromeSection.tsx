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
  /**
   * OPT-K103 — visible progressive-disclosure cue (e.g. alert count) while nested.
   * Keeps secondary chrome findable without dumping it into the primary surface.
   */
  meta?: string | number;
  className?: string;
  'data-testid'?: string;
};

export function CollapsibleChromeSection({
  title,
  children,
  defaultOpen = false,
  alwaysCollapse = false,
  meta,
  className,
  'data-testid': testId = 'collapsible-chrome-section',
}: Props) {
  const minimal = useMinimalTheme();
  const [open, setOpen] = useState(defaultOpen);
  const metaLabel = meta === undefined || meta === '' || meta === 0 ? null : String(meta);

  if (!alwaysCollapse && !minimal) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        /* OPT-K115/K155 — spacing only; no framed chrome box / hairline cage */
        'collapsible-chrome-section shrink-0 border-0 bg-transparent',
        className,
      )}
      data-testid={testId}
      data-minimal-chrome="true"
      data-chrome-meta={metaLabel ?? undefined}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-1 text-left type-caption font-medium text-text-secondary hover:text-text-primary"
        aria-expanded={open}
        aria-label={metaLabel ? `${title} (${metaLabel})` : title}
        data-testid={`${testId}-toggle`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
          {metaLabel ? (
            <span
              className="ux-chrome-meta-badge shrink-0"
              data-testid={`${testId}-meta`}
            >
              {metaLabel}
            </span>
          ) : null}
        </span>
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
