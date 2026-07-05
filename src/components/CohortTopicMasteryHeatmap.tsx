import type { OrgAnalytics } from '../lib/orgClient';
import { cn } from '../utils/cn';

type Props = {
  analytics: OrgAnalytics;
  lang: 'en' | 'el';
};

function masteryColor(level: number): string {
  if (level <= 0) return 'bg-surface-primary';
  if (level < 0.5) return 'bg-red-500/45';
  if (level < 0.7) return 'bg-accent-amber/55';
  if (level < 0.85) return 'bg-brand-500/55';
  return 'bg-accent-emerald/75';
}

export function CohortTopicMasteryHeatmap({ analytics, lang }: Props) {
  const heatmaps = analytics.topicMasteryHeatmap ?? [];
  if (heatmaps.length === 0) return null;

  const title = lang === 'el' ? 'Mastery ανά θέμα' : 'Topic mastery heatmap';

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle/50" data-testid="topic-mastery-heatmap">
      <p className="text-xs font-medium text-text-primary">{title}</p>
      {heatmaps.map((hm) => (
        <div key={hm.classId} className="space-y-1">
          <p className="text-[10px] text-text-muted truncate">{hm.className}</p>
          <div className="flex flex-wrap gap-1">
            {hm.topics.map((topic) => {
              const tip =
                topic.avgScore != null
                  ? `${topic.topicLabel}: ${Math.round(topic.avgScore)}% (${topic.gradedCount})`
                  : `${topic.topicLabel}: —`;
              return (
                <div
                  key={`${hm.classId}-${topic.topicId}`}
                  title={tip}
                  className={cn(
                    'min-w-[2.5rem] max-w-[5rem] rounded-sm border border-border-subtle/40 px-1 py-0.5',
                    masteryColor(topic.masteryLevel),
                  )}
                >
                  <p className="text-[7px] text-text-primary truncate leading-tight">{topic.topicLabel}</p>
                  <p className="text-[8px] font-bold text-text-primary text-center">
                    {topic.avgScore != null ? `${Math.round(topic.avgScore)}%` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
