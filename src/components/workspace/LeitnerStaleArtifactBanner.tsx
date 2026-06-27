import { AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import {
  LEITNER_STALE_MIN_TOUCH_PX,
  leitnerStaleBannerCopy,
  type LeitnerStaleBannerPlacement,
} from '../../lib/leitnerStaleArtifactUX';

type Props = {
  lang: 'en' | 'el';
  placement: LeitnerStaleBannerPlacement;
  onDismiss: () => void;
};

export function LeitnerStaleArtifactBanner({ lang, placement, onDismiss }: Props) {
  const isEl = lang === 'el';
  const compact = placement === 'deck-sticky';
  const copy = leitnerStaleBannerCopy(lang, compact);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-accent-amber/35 bg-accent-amber/10 px-3 py-2.5 ws-status-strip ws-status-warn',
        placement === 'header' && 'mb-3 hidden sm:flex sm:flex-row sm:items-start sm:justify-between',
        placement === 'deck-sticky' && 'sticky top-0 z-20 mb-3 sm:hidden shadow-md backdrop-blur-sm',
      )}
      data-testid={placement === 'deck-sticky' ? 'leitner-stale-banner-mobile' : 'artifact-stale-banner-leitner'}
      role="status"
      aria-live="polite"
      aria-label={isEl ? 'Προειδοποίηση παλιών καρτών' : 'Outdated flashcards warning'}
    >
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <p className="text-[11px] leading-relaxed">{copy}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        style={{ minHeight: LEITNER_STALE_MIN_TOUCH_PX }}
        className={cn(
          'ws-empty-cta-secondary shrink-0 px-3 text-[11px] touch-manipulation',
          compact ? 'w-full' : 'self-end sm:self-auto',
        )}
        data-testid={`artifact-stale-dismiss-leitner${compact ? '-mobile' : ''}`}
      >
        {isEl ? 'Εντάξει, συνέχεια' : 'Got it'}
      </button>
    </div>
  );
}
