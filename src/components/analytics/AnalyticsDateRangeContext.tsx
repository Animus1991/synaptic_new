import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ANALYTICS_DATE_RANGES,
  rangeLabel,
  type AnalyticsDateRange,
} from '../../features/analytics/analyticsDateRange';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Ctx = {
  range: AnalyticsDateRange;
  setRange: (r: AnalyticsDateRange) => void;
};

const AnalyticsDateRangeContext = createContext<Ctx | null>(null);

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function AnalyticsDateRangeProvider({
  children,
  initial = '30d',
}: {
  children: ReactNode;
  initial?: AnalyticsDateRange;
}) {
  const [range, setRange] = useState<AnalyticsDateRange>(initial);
  const value = useMemo(() => ({ range, setRange }), [range]);
  return (
    <AnalyticsDateRangeContext.Provider value={value}>
      {children}
    </AnalyticsDateRangeContext.Provider>
  );
}

export function useAnalyticsDateRange(): Ctx {
  const ctx = useContext(AnalyticsDateRangeContext);
  if (!ctx) {
    throw new Error('useAnalyticsDateRange requires AnalyticsDateRangeProvider');
  }
  return ctx;
}

/** Compact 7d / 30d / semester toggle. */
export function AnalyticsDateRangeFilter({ className }: { className?: string }) {
  const { range, setRange } = useAnalyticsDateRange();
  const { lang } = useI18n();
  return (
    <div
      /* OPT-K128 — wash segmented control (no outline cage) */
      className={cn('inline-flex items-center gap-1 rounded-lg border-0 bg-surface-secondary/60 p-0.5', className)}
      role="group"
      aria-label={lang === 'el' ? 'Εύρος ημερομηνιών' : 'Date range'}
      data-testid="analytics-date-range-filter"
    >
      {ANALYTICS_DATE_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          data-testid={`analytics-range-${r}`}
          aria-pressed={range === r}
          onClick={() => setRange(r)}
          className={cn(
            'rounded-md border-0 px-2.5 py-1 type-caption font-semibold transition-colors',
            range === r
              ? 'bg-surface-card text-text-primary'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/60',
          )}
        >
          {rangeLabel(r, lang)}
        </button>
      ))}
    </div>
  );
}
