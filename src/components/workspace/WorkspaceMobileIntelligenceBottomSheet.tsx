import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import {
  WorkspaceMobileIntelligenceTabs,
  type MobileIntelTab,
} from './WorkspaceMobileIntelligenceTabs';

type Props = {
  active: MobileIntelTab | null;
  onChange: (tab: MobileIntelTab | null) => void;
  lang?: 'en' | 'el';
  badges?: Partial<Record<MobileIntelTab, number>>;
  children: ReactNode;
  className?: string;
};

/** Mobile intelligence as fixed bottom sheet (PLATFORM_UI_UX §2.2). */
export function WorkspaceMobileIntelligenceBottomSheet({
  active,
  onChange,
  lang = 'en',
  badges,
  children,
  className,
}: Props) {
  const isEl = lang === 'el';

  const handleTab = (tab: MobileIntelTab) => {
    onChange(active === tab ? null : tab);
  };

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.button
            type="button"
            aria-label={isEl ? 'Κλείσιμο πίνακα' : 'Close panel'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            onClick={() => onChange(null)}
            data-testid="workspace-intel-backdrop"
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
          className,
        )}
        data-testid="workspace-mobile-intel-bottom-sheet"
      >
        <AnimatePresence>
          {active && (
            <motion.div
              key={active}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="ws-bento rounded-b-none border-b-0 max-h-[min(70vh,28rem)] flex flex-col shadow-[0_-12px_40px_rgba(42,31,18,0.18)]"
              role="dialog"
              aria-modal="true"
              aria-label={isEl ? 'Πληροφορίες μάθησης' : 'Learning intelligence'}
            >
              <div className="flex items-center justify-center py-2 shrink-0">
                <span className="h-1 w-10 rounded-full bg-border-subtle" aria-hidden />
              </div>
              <div className="flex items-center justify-between px-3 pb-2 shrink-0">
                <p className="text-xs font-semibold text-brand-800">
                  {isEl ? 'Νοητική εικόνα' : 'Study intelligence'}
                </p>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                  aria-label={isEl ? 'Κλείσιμο' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-4 min-h-0">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-border-subtle bg-surface-primary/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <WorkspaceMobileIntelligenceTabs
            active={active}
            onChange={handleTab}
            lang={lang}
            badges={badges}
          />
        </div>
      </div>
    </>
  );
}
