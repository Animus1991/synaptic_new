import { useMemo } from 'react';
import type { ActivityItem } from '../../types';
import { buildStudyBehaviorModel } from '../../lib/studyBehaviorCharts';
import { useAnalyticsDateRange } from './AnalyticsDateRangeContext';
import { SectionLabel } from '../ui/SectionLabel';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  activities: ActivityItem[];
  className?: string;
};

export function StudyBehaviorCharts({ activities, className }: Props) {
  const { range } = useAnalyticsDateRange();
  const { lang } = useI18n();
  const model = useMemo(
    () => buildStudyBehaviorModel(activities, range, lang),
    [activities, range, lang],
  );

  const maxBar = Math.max(1, ...model.dayBars.map((d) => d.count));
  const maxEff = Math.max(1, ...model.effectiveness.map((d) => d.score));
  const totalSlices = model.sessionTypes.reduce((s, x) => s + x.value, 0) || 1;

  let donutAccum = 0;
  const donutSegments = model.sessionTypes.map((s) => {
    const start = donutAccum;
    const sweep = (s.value / totalSlices) * 360;
    donutAccum += sweep;
    return { ...s, start, sweep };
  });

  return (
    <div className={cn('space-y-3', className)} data-testid="study-behavior-charts">
      <SectionLabel>{lang === 'el' ? 'Συμπεριφορά μελέτης' : 'Study behavior'}</SectionLabel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-3" data-testid="study-behavior-bars">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">
            {lang === 'el' ? 'Δραστηριότητα' : 'Activity'}
          </p>
          <div className="flex items-end gap-1 h-24">
            {model.dayBars.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full rounded-t bg-brand-600/70"
                  style={{ height: `${Math.max(4, (d.count / maxBar) * 100)}%` }}
                  title={`${d.label}: ${d.count}`}
                />
                <span className="text-[8px] text-text-muted truncate w-full text-center">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-card p-3" data-testid="study-behavior-effectiveness">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">
            {lang === 'el' ? 'Αποτελεσματικότητα' : 'Effectiveness'}
          </p>
          <svg viewBox={`0 0 ${Math.max(model.effectiveness.length * 24, 120)} 80`} className="w-full h-24" role="img">
            <polyline
              fill="none"
              stroke="var(--color-accent-teal)"
              strokeWidth="2"
              points={model.effectiveness
                .map((p, i) => `${12 + i * 24},${72 - (p.score / maxEff) * 56}`)
                .join(' ')}
            />
            {model.effectiveness.map((p, i) => (
              <circle
                key={p.key}
                cx={12 + i * 24}
                cy={72 - (p.score / maxEff) * 56}
                r="2.5"
                fill="var(--color-accent-teal)"
              />
            ))}
          </svg>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-card p-3 flex items-center gap-3" data-testid="study-behavior-donut">
          <svg viewBox="0 0 42 42" className="h-20 w-20 shrink-0" role="img">
            {donutSegments.length === 0 ? (
              <circle cx="21" cy="21" r="15.5" fill="none" stroke="var(--color-border-subtle)" strokeWidth="6" />
            ) : (
              donutSegments.map((s) => (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.5"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeDasharray={`${(s.sweep / 360) * 97.4} ${97.4}`}
                  strokeDashoffset={-((s.start / 360) * 97.4)}
                  transform="rotate(-90 21 21)"
                />
              ))
            )}
          </svg>
          <ul className="space-y-1 min-w-0">
            {model.sessionTypes.length === 0 ? (
              <li className="text-[10px] text-text-muted">
                {lang === 'el' ? 'Χωρίς δεδομένα στο εύρος' : 'No data in range'}
              </li>
            ) : (
              model.sessionTypes.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                  <span className="tabular-nums text-text-muted ml-auto">{s.value}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
