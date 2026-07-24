import { cn } from '../../utils/cn';
import {
  LEITNER_STALE_MIN_TOUCH_PX,
  leitnerStaleBannerCopy,
  type LeitnerStaleBannerPlacement,
} from '../../lib/leitnerStaleArtifactUX';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { useI18n } from '../../lib/i18n';

type Props = {
  lang: 'en' | 'el';
  placement: LeitnerStaleBannerPlacement;
  onDismiss: () => void;
};

export function LeitnerStaleArtifactBanner({ lang, placement, onDismiss }: Props) {
  const { t } = useI18n();
  const compact = placement === 'deck-sticky';
  const copy = leitnerStaleBannerCopy(lang, compact);

  return (
    <WorkspacePanelWarnStrip
      testId={placement === 'deck-sticky' ? 'leitner-stale-banner-mobile' : 'artifact-stale-banner-leitner'}
      className={cn(
        'flex-col gap-2 py-2.5',
        placement === 'header' && 'hidden sm:flex sm:flex-row sm:items-start sm:justify-between',
        placement === 'deck-sticky' && 'sticky top-0 z-20 mb-3 sm:hidden shadow-md backdrop-blur-sm',
      )}
      trailing={
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
          {t('gotItContinue')}
        </button>
      }
    >
      <p className="text-[11px] leading-relaxed font-normal" aria-live="polite">
        {copy}
      </p>
    </WorkspacePanelWarnStrip>
  );
}
