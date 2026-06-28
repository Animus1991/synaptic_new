import { cn } from '../../utils/cn';

interface CalibrationCompareBarProps {
  predictedPct: number;
  actualPct: number;
  youLabel: string;
  actualLabel: string;
}

const MIN_IN_BAR_LABEL = 24;

/** Predicted vs actual confidence — labels inside fills with high-contrast white text. */
export function CalibrationCompareBar({
  predictedPct,
  actualPct,
  youLabel,
  actualLabel,
}: CalibrationCompareBarProps) {
  const predicted = Math.max(0, Math.min(100, predictedPct));
  const actual = Math.max(0, Math.min(100, actualPct));
  const showYouInside = predicted >= MIN_IN_BAR_LABEL;
  const showActualInside = actual >= MIN_IN_BAR_LABEL;

  return (
    <div className="relative h-7 flex-1 rounded-lg bg-viz-track overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-lg bg-brand-600"
        style={{ width: `${predicted}%` }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-lg bg-accent-emerald"
        style={{ width: `${actual}%` }}
      />

      {showYouInside ? (
        <span
          className="viz-bar-label absolute inset-y-0 left-0 flex items-center truncate pl-2 text-[10px] font-semibold pointer-events-none"
          style={{ maxWidth: `${predicted}%` }}
        >
          {youLabel}
        </span>
      ) : (
        <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-text-primary">
          {youLabel}
        </span>
      )}

      {showActualInside ? (
        <span
          className="viz-bar-label absolute inset-y-0 flex items-center justify-end truncate pr-2 text-[10px] font-semibold pointer-events-none"
          style={{ left: 0, width: `${actual}%` }}
        >
          {actualLabel}
        </span>
      ) : (
        <span
          className={cn(
            'absolute inset-y-0 flex items-center text-[10px] font-medium text-text-primary whitespace-nowrap',
            actual > 0 ? 'pl-1' : 'left-2',
          )}
          style={actual > 0 ? { left: `${actual}%` } : undefined}
        >
          {actualLabel}
        </span>
      )}
    </div>
  );
}
