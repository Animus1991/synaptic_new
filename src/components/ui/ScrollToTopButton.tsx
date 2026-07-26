import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from '../../lib/lucide-shim';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

const SHOW_AFTER_PX = 480;

/**
 * Floating "back to top" affordance for long single-scroll pages (e.g. Dashboard).
 * Additive-only: does not alter any existing layout, only appears once the user
 * has scrolled past SHOW_AFTER_PX and fades out otherwise. Mirrors the compact
 * icon-button sizing already used by the dashboard layout toggle (--btn-height).
 */
export function ScrollToTopButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER_PX);
        tickingRef.current = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          data-testid="scroll-to-top-button"
          aria-label={t('dashScrollToTop')}
          title={t('dashScrollToTop')}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: reduced ? 0.1 : 0.18, ease: [0, 0, 0.2, 1] }}
          className={cn(
            /* Soft panel radius (not stadium); no blur — Minimal Primer harmony */
            'fixed bottom-20 right-4 z-40 grid h-10 w-10 place-items-center rounded-xl border',
            'border-border-subtle bg-surface-card text-text-secondary shadow-sm',
            'hover:border-border-strong hover:text-text-primary hover:bg-surface-secondary',
            'lg:bottom-6 lg:right-6',
            className,
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
