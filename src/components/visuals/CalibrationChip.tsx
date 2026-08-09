import { cn } from '../../utils/cn';
import type { CalibrationDirection } from '../../lib/pedagogy';
import { useI18n, type I18nKey } from '../../lib/i18n';

interface Props {
  score: number;
  direction: CalibrationDirection;
}

const META: Record<CalibrationDirection, { textKey: I18nKey; hintKey: I18nKey; chip: string }> = {
  overconfident: {
    textKey: 'dashOverconfident',
    hintKey: 'dashOverconfidentHint',
    chip: 'ws-chip-danger',
  },
  underconfident: {
    textKey: 'dashUnderconfident',
    hintKey: 'dashUnderconfidentHint',
    chip: 'ws-chip-brand',
  },
  calibrated: {
    textKey: 'dashCalibrated',
    hintKey: 'dashCalibratedHint',
    chip: 'ws-chip-ok',
  },
};

/** Wave H2 — warm bilingual confidence match (no repo “calibration” lecture). */
export function CalibrationChip({ score, direction }: Props) {
  const { t } = useI18n();
  const meta = META[direction];
  return (
    <div className="w-full max-w-none border-0 px-1 py-2.5" data-testid="calibration-chip" data-bleed="full">
      <div className="proximity-row flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn('proximity-row-label type-caption px-2.5 py-1 rounded-full', meta.chip)}>
          {t(meta.textKey)}
        </span>
        <span className="text-lg font-bold text-text-primary ws-num tabular-nums shrink-0">{score}/100</span>
      </div>
      <p className="proximity-track type-caption text-text-secondary mt-2 leading-relaxed">{t(meta.hintKey)}</p>
    </div>
  );
}
