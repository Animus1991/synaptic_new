import { cn } from '../../utils/cn';
import { useI18n, type I18nKey } from '../../lib/i18n';

const BOX_KEYS = ['leitnerAgain', 'leitnerHard', 'leitnerGood', 'leitnerEasy'] as const;

const BOX_META: { key: (typeof BOX_KEYS)[number]; dotClass: string; scheduleKey: I18nKey }[] = [
  { key: 'leitnerAgain', dotClass: 'leitner-box-dot-again', scheduleKey: 'leitnerBoxScheduleAgain' },
  { key: 'leitnerHard', dotClass: 'leitner-box-dot-hard', scheduleKey: 'leitnerBoxScheduleHard' },
  { key: 'leitnerGood', dotClass: 'leitner-box-dot-good', scheduleKey: 'leitnerBoxScheduleGood' },
  { key: 'leitnerEasy', dotClass: 'leitner-box-dot-easy', scheduleKey: 'leitnerBoxScheduleEasy' },
];

type Props = {
  counts: number[];
  total: number;
  activeIndex?: number | null;
  onSelect?: (index: number | null) => void;
};

/** FSRS bucket rail — Option-B 5-box gallery chrome adapted for 4 FSRS ratings (Wave E16). */
export function LeitnerFsrsBoxRail({ counts, total, activeIndex = null, onSelect }: Props) {
  const { t } = useI18n();
  const safeTotal = Math.max(total, 1);

  return (
    <div className="leitner-box-rail space-y-2" data-testid="leitner-fsrs-box-rail">
      {BOX_META.map((meta, index) => {
        const count = counts[index] ?? 0;
        const active = activeIndex === index;
        return (
          <button
            key={meta.key}
            type="button"
            onClick={() => onSelect?.(active ? null : index)}
            className={cn('leitner-box-rail-item', active && 'leitner-box-rail-item-active')}
            aria-pressed={active}
          >
            <span className={cn('leitner-box-rail-dot', meta.dotClass)} aria-hidden />
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-text-primary">{t(meta.key)}</span>
                <span className="text-xs text-text-muted">{count}</span>
              </span>
              <span className="mt-0.5 block text-[10px] text-text-muted">{t(meta.scheduleKey)}</span>
            </span>
            <span className="leitner-box-rail-meter" aria-hidden>
              <span
                className="leitner-box-rail-meter-fill"
                style={{ width: `${(count / safeTotal) * 100}%` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
