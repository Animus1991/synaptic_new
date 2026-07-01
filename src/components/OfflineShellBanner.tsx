import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiSlash, CheckCircle } from '@phosphor-icons/react';
import { useI18n } from '../lib/i18n';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cn } from '../utils/cn';

const BACK_ONLINE_MS = 3200;

/** Sticky offline shell banner + brief reconnect toast (Sprint 7 PWA). */
export function OfflineShellBanner() {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;
    setShowBackOnline(true);
    const id = window.setTimeout(() => setShowBackOnline(false), BACK_ONLINE_MS);
    return () => window.clearTimeout(id);
  }, [online]);

  return (
    <>
      {!online && (
        <div
          data-testid="pwa-offline-banner"
          role="status"
          className={cn(
            'sticky top-14 z-[19] border-b border-accent-amber/35',
            'bg-surface-secondary/95 backdrop-blur px-4 py-2.5 sm:px-6',
          )}
        >
          <div className="flex items-start gap-2.5 max-w-6xl mx-auto">
            <WifiSlash className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{t('pwaOfflineTitle')}</p>
              <p className="text-xs text-text-secondary mt-0.5">{t('pwaOfflineHint')}</p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showBackOnline && online && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 lg:bottom-6 left-1/2 z-[200] -translate-x-1/2 max-w-sm w-[calc(100%-2rem)]"
            data-testid="pwa-back-online-toast"
          >
            <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/35 bg-surface-secondary/95 backdrop-blur px-4 py-2.5 shadow-lg">
              <CheckCircle className="w-5 h-5 text-accent-emerald shrink-0" weight="fill" aria-hidden />
              <p className="text-sm text-text-primary">{t('pwaBackOnline')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
