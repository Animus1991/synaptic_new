import type { OrgAnalytics } from '../lib/orgClient';
import { cn } from '../utils/cn';

type Props = {
  analytics: OrgAnalytics;
  lang: 'en' | 'el';
};

function cellIntensity(gradedCount: number, max: number): number {
  if (max <= 0 || gradedCount <= 0) return 0;
  return Math.min(1, gradedCount / max);
}

export function CohortHeatmap({ analytics, lang }: Props) {
  const heatmaps = analytics.cohortHeatmap ?? [];
  if (heatmaps.length === 0) return null;

  const maxGraded = Math.max(
    1,
    ...heatmaps.flatMap((h) => h.days.map((d) => d.gradedCount)),
  );

  const title = lang === 'el' ? 'Cohort heatmap (14 ημέρες)' : 'Cohort heatmap (14 days)';
  const gradedLabel = lang === 'el' ? 'βαθμοί' : 'grades';
  const activeLabel = lang === 'el' ? 'ενεργοί' : 'active';

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle/50" data-testid="cohort-heatmap">
      <p className="text-xs font-medium text-text-primary">{title}</p>
      {heatmaps.map((hm) => (
        <div key={hm.classId} className="space-y-1">
          <p className="text-[10px] text-text-muted truncate">{hm.className}</p>
          <div className="flex gap-0.5 flex-wrap">
            {hm.days.map((day) => {
              const intensity = cellIntensity(day.gradedCount, maxGraded);
              const tip = `${day.date}: ${day.gradedCount} ${gradedLabel}, ${day.activeStudents} ${activeLabel}${
                day.avgScore != null ? `, avg ${Math.round(day.avgScore)}%` : ''
              }`;
              return (
                <div
                  key={`${hm.classId}-${day.date}`}
                  title={tip}
                  className={cn(
                    'w-3 h-3 rounded-sm border border-border-subtle/40',
                    intensity === 0 && 'bg-surface-primary',
                    intensity > 0 && intensity < 0.34 && 'bg-brand-400/30',
                    intensity >= 0.34 && intensity < 0.67 && 'bg-brand-500/55',
                    intensity >= 0.67 && 'bg-brand-600/85',
                  )}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
