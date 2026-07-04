import type { ImageOcclusionPayload } from '../../lib/imageOcclusionCards';
import { useI18n } from '../../lib/i18n';

type Props = {
  occlusion: ImageOcclusionPayload;
  flipped: boolean;
};

export function LeitnerOcclusionFace({ occlusion, flipped }: Props) {
  const { t } = useI18n();
  const { region, sourceFileName, hiddenLabel } = occlusion;

  return (
    <div
      className="relative w-full min-h-[140px] rounded-lg border border-border-subtle bg-surface-card overflow-hidden"
      data-testid="leitner-occlusion-face"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-surface-card to-accent-cyan/10" />
      <p className="relative z-10 px-3 pt-2 text-[9px] text-text-muted truncate">{sourceFileName}</p>
      <div className="relative mx-3 mb-3 mt-1 aspect-[4/3] rounded-md border border-dashed border-brand-500/30 bg-surface-primary/80">
        {!flipped && (
          <div
            className="absolute flex items-center justify-center rounded-sm bg-surface-primary/95 border border-brand-600/40 shadow-sm"
            style={{
              left: `${region.left}%`,
              top: `${region.top}%`,
              width: `${Math.max(region.width, 8)}%`,
              height: `${Math.max(region.height, 10)}%`,
            }}
            data-testid="leitner-occlusion-mask"
          >
            <span className="text-lg font-bold text-text-muted">?</span>
          </div>
        )}
        {flipped && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <span className="text-sm font-semibold text-brand-800">{hiddenLabel}</span>
          </div>
        )}
      </div>
      {!flipped && (
        <p className="relative z-10 px-3 pb-2 text-[10px] text-text-secondary">{t('leitnerOcclusionHint')}</p>
      )}
    </div>
  );
}
