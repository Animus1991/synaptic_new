import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WeakSpotWithReasons } from '../../lib/weakAreaReasons';
import { isWeakSpotFocused } from '../../lib/workspaceWeakAreas';

export function WeakAreasFocusRail({
  spots,
  focusTerm,
  lang,
  expanded,
  onToggle,
  onFocusWeakSpot,
}: {
  spots: WeakSpotWithReasons[];
  focusTerm?: string;
  lang: 'en' | 'el';
  expanded: boolean;
  onToggle: () => void;
  onFocusWeakSpot: (concept: string) => void;
}) {
  if (spots.length === 0) return null;

  const isEl = lang === 'el';

  return (
    <div
      className="shrink-0 border-b border-accent-rose/20 bg-accent-rose/5"
      data-testid="workspace-weak-areas-rail"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent-rose/8 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" />
          <p className="text-[11px] font-semibold text-text-primary truncate">
            {isEl ? 'Αδύναμα σημεία' : 'Weak areas'}
            <span className="ml-1.5 font-normal text-text-tertiary">({spots.length})</span>
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
      </button>

      {expanded && (
        <>
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 hide-scrollbar">
            {spots.map((spot) => {
              const active = isWeakSpotFocused(spot, focusTerm);
              return (
                <button
                  key={spot.concept}
                  type="button"
                  data-testid={`weak-area-chip-${normalizeChipKey(spot.concept)}`}
                  onClick={() => onFocusWeakSpot(spot.concept)}
                  title={`${spot.concept} · ${spot.mastery}%`}
                  className={cn(
                    'shrink-0 max-w-[150px] truncate rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                    active
                      ? 'border-accent-rose/60 bg-accent-rose/20 text-accent-rose'
                      : 'border-white/10 bg-surface-card text-text-secondary hover:border-accent-rose/40 hover:text-accent-rose',
                  )}
                >
                  {spot.concept.slice(0, 28)}
                  <span className="ml-1 opacity-70">{spot.mastery}%</span>
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-3 space-y-2 border-t border-accent-rose/15 pt-2 max-h-40 overflow-y-auto">
            {spots.map((spot) => (
              <div
                key={`detail-${spot.concept}`}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2"
                data-testid={`weak-area-detail-${normalizeChipKey(spot.concept)}`}
              >
                <button
                  type="button"
                  onClick={() => onFocusWeakSpot(spot.concept)}
                  className="text-[11px] font-semibold text-text-primary hover:text-accent-rose truncate block max-w-full text-left"
                >
                  {spot.concept}
                  <span className="ml-1.5 font-normal text-text-muted">{spot.mastery}%</span>
                </button>
                {spot.reasons.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {spot.reasons.map((reason) => (
                      <span
                        key={reason.id}
                        className={cn(
                          'rounded-full border px-1.5 py-0.5 text-[9px]',
                          reason.severity === 'high'
                            ? 'border-accent-rose/40 bg-accent-rose/15 text-accent-rose'
                            : reason.severity === 'medium'
                              ? 'border-accent-amber/35 bg-accent-amber/10 text-accent-amber'
                              : 'border-white/10 bg-white/[0.04] text-text-muted',
                        )}
                      >
                        {reason.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[9px] text-text-muted">
                    {isEl ? 'Χαμηλό mastery — χρειάζεται επανάληψη' : 'Low mastery — needs review'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function normalizeChipKey(concept: string): string {
  return concept.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
}
