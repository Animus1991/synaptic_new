import { useState } from 'react';
import { Calendar } from '@/lib/lucide-shim';
import type { LearningTimelineEvent, TimelineEventType } from '../../lib/knowledgeFlowAnalytics';
import { cn } from '../../utils/cn';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { AllCapsLabel } from '../ui/AllCapsLabel';

const TYPE_STYLE: Record<TimelineEventType, { border: string; bg: string; text: string }> = {
  lesson: { border: 'border-accent-cyan/30', bg: 'bg-accent-cyan/10', text: 'text-text-primary' },
  quiz: { border: 'border-accent-violet/30', bg: 'bg-accent-violet/10', text: 'text-text-primary' },
  review: { border: 'border-accent-emerald/30', bg: 'bg-accent-emerald/10', text: 'text-text-primary' },
  error: { border: 'border-accent-rose/30', bg: 'bg-accent-rose/10', text: 'text-text-primary' },
  mastery: { border: 'border-accent-amber/30', bg: 'bg-accent-amber/10', text: 'text-text-primary' },
  task: { border: 'border-brand-500/25', bg: 'bg-brand-500/8', text: 'text-text-primary' },
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
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </BlueprintSurface>
    );
  }

  return (
    <BlueprintSurface data-testid="learning-timeline">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <p className="text-xs text-text-tertiary mb-4">{hint}</p>

      <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-4">
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
                    'w-full rounded-xl border p-3 text-left transition-all duration-200 hover:brightness-105',
                    style.border,
                    style.bg,
                    style.text,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold line-clamp-1">{event.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.delta !== 0 && (
                        <span
                          className={cn(
                            'text-xs font-bold tabular-nums',
                            event.delta > 0 ? 'text-accent-emerald' : 'text-accent-rose',
                          )}
                        >
                          {event.delta > 0 ? '+' : ''}
                          {event.delta}
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">
                        <AllCapsLabel>{dayLabel(event.daysAgo)}</AllCapsLabel>
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-border-subtle/60 pt-3">
                      <p className="text-xs text-text-secondary leading-relaxed">{event.detail}</p>
                      {event.delta !== 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">{deltaLabel}</span>
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
