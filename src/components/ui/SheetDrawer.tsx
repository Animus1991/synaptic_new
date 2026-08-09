import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useMotionInitial, useMotionTransition } from '../../lib/motionPrefs';
import { FOCUS_TRAP_FOCUSABLE } from './FocusTrapDialog';

export type SheetDrawerPlacement = 'right' | 'bottom';

export type SheetDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  subtitle?: string;
  placement?: SheetDrawerPlacement;
  'data-testid'?: string;
};

/**
 * Focus-trapped sheet — bottom on narrow viewports, right drawer on tablet+.
 * Canon Drawer pattern adapted to Synapse tokens (OPT-K105).
 */
export function SheetDrawer({
  open,
  onClose,
  title,
  children,
  subtitle,
  placement = 'right',
  'data-testid': testId = 'sheet-drawer',
}: SheetDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isBottom = placement === 'bottom';
  const overlayInitial = useMotionInitial({ opacity: 0 });
  const panelInitial = useMotionInitial(isBottom ? { y: '100%' } : { x: '100%' });
  const panelTransition = useMotionTransition({ type: 'spring', damping: 28, stiffness: 320 });

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll(FOCUS_TRAP_FOCUSABLE);
      const nodes: HTMLElement[] = [];
      focusables.forEach((node) => {
        const el = node as HTMLElement;
        if (!el.hasAttribute('disabled') && el.offsetParent !== null) nodes.push(el);
      });
      if (!nodes.length) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUS_TRAP_FOCUSABLE);
      (first || panelRef.current)?.focus();
    });

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={overlayInitial}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            className="fixed inset-0 z-[190] bg-black/45 backdrop-blur-sm print:hidden"
            onClick={onClose}
            aria-hidden="true"
            data-testid={`${testId}-overlay`}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            data-testid={testId}
            initial={panelInitial}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: '100%' } : { x: '100%' }}
            transition={panelTransition}
            className={cn(
              'fixed z-[191] flex flex-col outline-none print:hidden border border-border-subtle bg-surface-card shadow-2xl',
              isBottom
                ? 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]'
                : 'top-0 right-0 h-full w-full max-w-md border-l',
            )}
          >
            {isBottom && (
              <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-border-subtle" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 sm:px-5 py-3 sm:py-4 shrink-0">
              <div className="min-w-0">
                <h2 id={titleId} className="type-meta font-semibold tracking-tight text-text-primary truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="type-caption mt-0.5 text-text-muted">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
