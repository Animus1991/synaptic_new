import { Link2, Flame } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ReaderStepHeatSyncSummary } from '../../lib/readerHeatmapStepSyncQA';
import { stepHeatDotClass } from '../../lib/readerHeatmapStepSyncQA';
import { useI18n } from '../../lib/i18n';

type Props = {
  summary: ReaderStepHeatSyncSummary | null;
  lang: 'en' | 'el';
  onJumpToSegment?: () => void;
};

export function ReaderStepHeatSyncStrip({ summary, lang: _lang, onJumpToSegment }: Props) {
  if (!summary) return null;
  const { t } = useI18n();

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-card/70 px-3 py-1.5"
      data-testid="reader-step-heat-sync-strip"
    >
      <Link2 className="h-3.5 w-3.5 shrink-0 text-brand-800" aria-hidden />
      <div className="min-w-0 flex-1 text-[10px] leading-snug text-text-secondary">
        <span className="font-medium text-text-primary">
          {t('heatStep')} {summary.stepIndex + 1}:
        </span>{' '}
        {summary.synced
          ? (summary.segmentLabel ?? summary.stepTitle)
          : (t('heatNotLinked'))}
      </div>
      {summary.heatLevel !== 'none' && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium text-white',
            summary.heatLevel === 'high' && 'bg-accent-rose/90',
            summary.heatLevel === 'medium' && 'bg-accent-amber/90',
            summary.heatLevel === 'low' && 'bg-brand-500/80',
          )}
          title={summary.heatReasons.join(' · ')}
          data-testid="reader-step-heat-badge"
        >
          <Flame className="h-3 w-3" />
          {summary.heatLevel}
        </span>
      )}
      {summary.synced && onJumpToSegment && (
        <button
          type="button"
          onClick={onJumpToSegment}
          className="shrink-0 rounded border border-accent-cyan/30 px-2 py-0.5 text-[9px] font-medium text-brand-800 hover:bg-accent-cyan/10"
        >
          {t('jump')}
        </button>
      )}
      {summary.synced && summary.heatLevel !== 'none' && (
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', stepHeatDotClass(summary.heatLevel))}
          aria-hidden
        />
      )}
    </div>
  );
}
