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
} from '../../lib/analyticsDateRange';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Ctx = {
  range: AnalyticsDateRange;
  setRange: (r: AnalyticsDateRange) => void;
};

const AnalyticsDateRangeContext = createContext<Ctx | null>(null);

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
      className={cn('inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-card p-0.5', className)}
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
            'rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors',
            range === r
              ? 'bg-brand-600/15 text-brand-800'
              : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {rangeLabel(r, lang)}
        </button>
      ))}
    </div>
  );
}
