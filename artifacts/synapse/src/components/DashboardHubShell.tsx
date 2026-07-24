import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { useI18n } from '../lib/i18n';
import type { DashboardHubActionId } from '../lib/dashboardHubRegistry';

interface Props {
  open: boolean;
  actionId: DashboardHubActionId | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function DashboardHubPopupShell({ open, actionId, title, onClose, children }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && actionId && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4" role="presentation">
          <motion.button
            type="button"
            aria-label={t('close')}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-hub-popup-title"
            tabIndex={-1}
            data-testid={`dashboard-hub-popup-${actionId}`}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="relative w-full max-w-lg max-h-[min(85vh,640px)] overflow-hidden rounded-2xl border border-border-subtle bg-surface-secondary shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle shrink-0">
              <h2 id="dashboard-hub-popup-title" className="text-sm font-semibold text-text-primary">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="p-1.5 rounded-lg hover:bg-surface-hover"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
