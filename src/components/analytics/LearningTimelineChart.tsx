import { useState } from 'react';
import { Calendar } from '@/lib/lucide-shim';
import type { LearningTimelineEvent, TimelineEventType } from '../../features/analytics/knowledgeFlowAnalytics';
import { cn } from '../../utils/cn';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { AllCapsLabel } from '../ui/AllCapsLabel';

/* OPT-K97 — event cards share calm wells; delta/dot carry semantic chroma */
/* OPT-K128 — wash event chips (no outline cages) */
const TYPE_STYLE: Record<TimelineEventType, { border: string; bg: string; text: string }> = {
  lesson: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
  quiz: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
  review: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
  error: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
  mastery: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
  task: { border: 'border-0', bg: 'bg-surface-secondary/70', text: 'text-text-primary' },
};

type Props = {
  events: LearningTimelineEvent[];
  hasData: boolean;
  title: string;
  hint: string;
  emptyLabel: string;
  dayLabel: (daysAgo: number) => string;
  deltaLabel: string;
};

export function LearningTimelineChart({
  events,
  hasData,
  title,
  hint,
  emptyLabel,
  dayLabel,
  deltaLabel,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!hasData || events.length === 0) {
    return (
      <BlueprintSurface
        className="flex flex-col items-center justify-center min-h-[220px] text-center"
        data-testid="learning-timeline-empty"
      >
        <Calendar className="w-8 h-8 text-text-tertiary mb-2" />
        <p className="type-body text-text-muted">{emptyLabel}</p>
      </BlueprintSurface>
    );
  }

  return (
    <BlueprintSurface data-testid="learning-timeline">
      <h3 className="type-meta font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-text-secondary" />
        {title}
      </h3>
      <p className="type-caption text-text-tertiary mb-4">{hint}</p>

      <div className="rounded-xl border-0 bg-surface-primary/40 p-4">
        <div className="relative ml-6 border-l-2 border-border-subtle pl-5">
          {events.map((event) => {
            const style = TYPE_STYLE[event.type];
            const isExpanded = expandedId === event.id;
            return (
              <div key={event.id} className="relative mb-3 last:mb-0">
                <span
                  className={cn(
                    'timeline-dot absolute -left-[1.65rem] top-3 h-2.5 w-2.5 rounded-full border-2 border-surface-card',
                    event.delta >= 0 ? 'bg-accent-emerald' : 'bg-accent-rose',
                  )}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className={cn(
                    'w-full rounded-xl border-0 p-3 text-left transition-all duration-200 hover:bg-surface-hover',
                    style.border,
                    style.bg,
                    style.text,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-meta font-semibold line-clamp-1">{event.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.delta !== 0 && (
                        <span
                          className={cn(
                            'type-caption font-bold tabular-nums ink-allow-accent',
                            event.delta > 0 ? 'text-accent-emerald' : 'text-accent-rose',
                          )}
                        >
                          {event.delta > 0 ? '+' : ''}
                          {event.delta}
                        </span>
                      )}
                      <span className="type-micro uppercase tracking-wider text-text-muted">
                        <AllCapsLabel>{dayLabel(event.daysAgo)}</AllCapsLabel>
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-transparent pt-3">
                      <p className="type-caption text-text-secondary leading-relaxed">{event.detail}</p>
                      {event.delta !== 0 && (
                        <div className="flex items-center gap-2">
                          <span className="type-micro text-text-muted">{deltaLabel}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                event.delta > 0 ? 'bg-accent-emerald/80' : 'bg-accent-rose/80',
                              )}
                              style={{ width: `${Math.min(100, Math.abs(event.delta) * 5)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </BlueprintSurface>
  );
}
