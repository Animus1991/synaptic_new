import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Props = {
  /** Accessible name for the overflow trigger. */
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  menuClassName?: string;
  /** Optional label next to the ⋯ icon (e.g. Export). */
  summaryLabel?: ReactNode;
  /** Override the default ⋯ icon trigger contents. */
  summary?: ReactNode;
  /** Applied to the root `<details>`. */
  'data-testid'?: string;
  /** Applied to the `<summary>` trigger when different from the root. */
  triggerTestId?: string;
  /** Close after any click inside the menu (default true). */
  closeOnSelect?: boolean;
};

/**
 * Wave E2 — shared panel overflow (`⋯`) with Escape + outside-pointer dismiss.
 * Replaces ad-hoc `<details>` menus so keyboard users get one consistent close path.
 */
export function PanelOverflowMenu({
  ariaLabel,
  children,
  className,
  summaryClassName,
  menuClassName,
  summaryLabel,
  summary,
  'data-testid': testId,
  triggerTestId,
  closeOnSelect = true,
}: Props) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        rootRef.current?.querySelector('summary')?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <details
      ref={rootRef}
      className={cn('relative', className)}
      data-testid={testId}
      open={open}
    >
      <summary
        className={cn(
          'flex min-h-9 min-w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary [&::-webkit-details-marker]:hidden',
          summaryLabel != null && 'gap-1 px-2.5 py-1',
          summaryClassName,
        )}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={triggerTestId}
        onClick={(e) => {
          // Fully control open state — native toggle + React `open` fight in jsdom/SSR.
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {summary ?? (
          <>
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            {summaryLabel}
          </>
        )}
      </summary>
      <div
        role="menu"
        className={cn(
          'absolute right-0 top-full z-20 mt-1 min-w-[10.5rem] rounded-lg border border-border-subtle bg-surface-elevated py-1 shadow-lg',
          menuClassName,
        )}
        onClick={() => {
          if (!closeOnSelect) return;
          setOpen(false);
        }}
      >
        {children}
      </div>
    </details>
  );
}
