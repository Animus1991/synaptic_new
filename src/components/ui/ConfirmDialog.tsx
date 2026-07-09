import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from '@/lib/lucide-shim';
import { PrimaryCTA, SecondaryCTA } from './primitives';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When true, confirm button shows a loading/disabled state. */
  confirming?: boolean;
  'data-testid'?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirming = false,
  'data-testid': testId = 'confirm-dialog',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${testId}-title`}
            aria-describedby={description ? `${testId}-desc` : undefined}
            data-testid={testId}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md ux-modal-panel rounded-2xl border border-border-subtle bg-surface-card shadow-2xl"
          >
            <div className="flex items-start gap-3 p-5 pb-3">
              {destructive && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-rose/15">
                  <AlertTriangle className="h-4 w-4 text-accent-rose" aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={`${testId}-title`} className="text-base font-semibold text-text-primary pr-6">
                  {title}
                </h2>
                {description && (
                  <p id={`${testId}-desc`} className="mt-2 text-sm text-text-secondary whitespace-pre-line">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-4 sm:flex-row sm:justify-end">
              <SecondaryCTA
                ref={cancelRef}
                onClick={onClose}
                disabled={confirming}
                data-testid={`${testId}-cancel`}
              >
                {cancelLabel}
              </SecondaryCTA>
              <PrimaryCTA
                onClick={onConfirm}
                disabled={confirming}
                data-testid={`${testId}-confirm`}
                className={destructive ? 'bg-accent-rose hover:bg-accent-rose/90' : undefined}
              >
                {confirmLabel}
              </PrimaryCTA>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
