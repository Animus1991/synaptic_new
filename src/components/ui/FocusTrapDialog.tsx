import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useMotionInitial, useMotionTransition } from '../../lib/motionPrefs';

export const FOCUS_TRAP_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type FocusTrapDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** When true, omit built-in title bar (caller supplies chrome). */
  hideHeader?: boolean;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  zIndex?: number;
  panelClassName?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  /** Align like ConfirmDialog (bottom sheet on mobile). */
  align?: 'center' | 'bottom-mobile';
  'data-testid'?: string;
  'aria-describedby'?: string;
  /** Optional header trailing slot (e.g. custom close). */
  headerTrailing?: ReactNode;
};

/**
 * Shared modal with Escape, Tab focus trap, restore-focus, and body scroll lock.
 * Canon Modal pattern adapted to Synapse surface tokens (OPT-K105).
 */
export function FocusTrapDialog({
  open,
  onClose,
  title,
  children,
  hideHeader = false,
  footer,
  size = 'md',
  zIndex = 200,
  panelClassName,
  bodyClassName,
  overlayClassName,
  align = 'center',
  'data-testid': testId,
  'aria-describedby': ariaDescribedBy,
  headerTrailing,
}: FocusTrapDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayInitial = useMotionInitial({ opacity: 0 });
  const panelInitial = useMotionInitial({ opacity: 0, y: 16, scale: 0.98 });
  const panelTransition = useMotionTransition({ duration: 0.2 });

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

  const maxW =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 flex justify-center p-4 print:hidden',
            align === 'bottom-mobile' ? 'items-end sm:items-center' : 'items-center',
          )}
          style={{ zIndex }}
          role="presentation"
          data-testid={testId}
        >
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm', overlayClassName)}
            initial={overlayInitial}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hideHeader ? undefined : titleId}
            aria-label={hideHeader ? title : undefined}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            initial={panelInitial}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={panelTransition}
            className={cn(
              'relative z-10 w-full outline-none flex flex-col max-h-[90vh]',
              'rounded-panel border border-border-subtle bg-surface-card shadow-2xl ux-modal-panel',
              maxW,
              panelClassName,
            )}
          >
            {!hideHeader && (
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4 sm:p-5 shrink-0">
                <h2 id={titleId} className="type-meta font-semibold tracking-tight text-text-primary sm:text-base">
                  {title}
                </h2>
                {headerTrailing}
              </div>
            )}
            <div
              className={cn(
                'overflow-y-auto flex-1',
                hideHeader ? undefined : 'p-4 sm:p-5',
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="border-t border-border-subtle p-3 sm:p-4 flex flex-wrap justify-end gap-2 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
