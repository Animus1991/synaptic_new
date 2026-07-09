import { AlertTriangle, ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { t, type Lang } from '../../lib/i18n';
import type { WeakSpotWithReasons } from '../../lib/weakAreaReasons';
import { isWeakSpotFocused } from '../../lib/workspaceWeakAreas';
import type { WorkspaceEmptyAction } from '../../lib/workspaceEmptyState';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';

export function WeakAreasFocusRail({
  spots,
  focusTerm,
  lang,
  expanded,
  onToggle,
  onFocusWeakSpot,
  emptyMessage,
  emptyActions = [],
}: {
  spots: WeakSpotWithReasons[];
  focusTerm?: string;
  lang: Lang;
  expanded: boolean;
  onToggle: () => void;
  onFocusWeakSpot: (concept: string) => void;
  emptyMessage?: string;
  emptyActions?: WorkspaceEmptyAction[];
}) {
  if (spots.length === 0) {
    return (
      <div className="shrink-0 border-b border-border-subtle/80 bg-surface-card/40" data-testid="workspace-weak-areas-rail">
        <WorkspaceToolEmptyState
          compact
          tool="weak-areas"
          message={emptyMessage ?? t('weakAreasEmpty', lang)}
          hasSource
          actions={emptyActions}
        />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 border-b border-border-subtle/80 bg-surface-card/40"
      data-testid="workspace-weak-areas-rail"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-hover"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <p className="text-[11px] font-semibold text-text-primary truncate">
            {t('weakAreasTitle', lang)}
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
                    active ? 'ws-chip-danger' : 'ws-chip-neutral hover:opacity-90',
                  )}
                >
                  {spot.concept.slice(0, 28)}
                  <span className="ml-1 opacity-70">{spot.mastery}%</span>
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-3 space-y-2 border-t border-border-subtle/60 pt-2 max-h-40 overflow-y-auto">
            {spots.map((spot) => (
              <div
                key={`detail-${spot.concept}`}
                className="rounded-xl border border-border-subtle bg-surface-card/60 px-2.5 py-2"
                data-testid={`weak-area-detail-${normalizeChipKey(spot.concept)}`}
              >
                <button
                  type="button"
                  onClick={() => onFocusWeakSpot(spot.concept)}
                  className="text-[11px] font-semibold text-text-primary hover:text-brand-800 truncate block max-w-full text-left"
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
                            ? 'ws-chip-danger'
                            : reason.severity === 'medium'
                              ? 'ws-chip-warn'
                              : 'ws-chip-neutral',
                        )}
                      >
                        {reason.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[9px] text-text-muted">
                    {t('lowMasteryReview', lang)}
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
