import { cn } from '../../utils/cn';
import type { QuizIrtConfidenceBand as Band } from '../../lib/quizIrt';

const TIER_BAR: Record<Band['tier'], string> = {
  unknown: 'bg-text-muted/25',
  low: 'bg-accent-rose/35',
  medium: 'bg-accent-amber/35',
  high: 'bg-accent-emerald/35',
};

const TIER_MARKER: Record<Band['tier'], string> = {
  unknown: 'bg-text-muted',
  low: 'bg-accent-rose',
  medium: 'bg-accent-amber',
  high: 'bg-accent-emerald',
};

type Props = {
  band: Band;
  className?: string;
};

export function QuizIrtConfidenceBand({ band, className }: Props) {
  const width = Math.max(4, band.highPct - band.lowPct);
  return (
    <div className={cn('space-y-1', className)} data-testid="quiz-irt-confidence-band">
      <div className="flex items-center justify-between gap-2 text-[9px]">
        <span className="text-text-secondary font-medium">{band.bandLabel}</span>
        <span className="font-mono text-text-muted shrink-0">{band.rangeLabel}</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-secondary overflow-hidden">
        <div
          className={cn('absolute inset-y-0 rounded-full transition-all duration-500', TIER_BAR[band.tier])}
          style={{ left: `${band.lowPct}%`, width: `${width}%` }}
        />
        <div
          className={cn(
            'absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full',
            TIER_MARKER[band.tier],
          )}
          style={{ left: `${band.pointPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
