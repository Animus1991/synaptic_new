import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X } from '@/lib/lucide-shim';

export type AppToast = {
  id: number;
  message: string;
};

export function AppToastBanner({
  toast,
  onDismiss,
}: {
  toast: AppToast | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="app-toast-shell fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 max-w-md w-[calc(100%-2rem)]"
          data-testid="app-toast"
        >
          <div className="app-toast-banner flex items-start gap-3 rounded-2xl border border-accent-emerald/35 bg-surface-secondary/95 backdrop-blur px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <CheckCircle2 className="w-5 h-5 text-accent-emerald shrink-0 mt-0.5" />
            <p className="text-sm text-text-primary flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
