import { useMemo } from 'react';
import type { RetentionForecastPoint } from '../../lib/adaptiveScheduler';
import type { SkillNode } from '../../types';
import {
  buildRetentionSparklineItems,
  sparklinePath,
} from '../../lib/decorativeSparklines';
import { cn } from '../../utils/cn';

type Props = {
  forecast: RetentionForecastPoint[];
  skills: SkillNode[];
  ariaLabel: string;
  emptyHint: string;
};

/** Mini sparkline grid — retention decay boards (Option-B Wave E10). */
export function RetentionSparklineBoard({ forecast, skills, ariaLabel, emptyHint }: Props) {
  const items = useMemo(
    () => buildRetentionSparklineItems(forecast, skills),
    [forecast, skills],
  );
  const hasLiveData = forecast.some((p) => p.avgRetrievability < 0.99) || skills.length > 0;

  if (items.length === 0) {
    return (
      <p className="text-xs text-text-muted text-center py-6" data-testid="retention-sparkline-board-empty">
        {emptyHint}
      </p>
    );
  }

  return (
    <div
      className="retention-sparkline-board grid grid-cols-2 sm:grid-cols-3 gap-3"
      data-testid="retention-sparkline-board"
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'retention-sparkline-cell rounded-xl border border-border-subtle/60',
            'bg-surface-primary/30 px-3 py-2.5 transition-colors',
          )}
        >
          <p className="text-[10px] font-medium text-text-secondary truncate mb-1.5" title={item.label}>
            {item.label}
          </p>
          <svg viewBox="0 0 80 28" className="w-full h-7" aria-hidden>
            <path
              className="retention-sparkline-stroke blueprint-stroke-gradient"
              d={sparklinePath(item.values, 80, 28)}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={hasLiveData ? 0.9 : 0.5}
            />
            <circle
              cx={80}
              cy={28 - Math.max(0, Math.min(1, item.values[item.values.length - 1] ?? 0)) * 24 - 2}
              r="2.5"
              className="blueprint-diagram-dot"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
