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
  const { t, lang } = useI18n();
  const model = useMemo(
    () => buildStudyBehaviorModel(activities, range, lang),
    [activities, range, lang],
  );

  const maxBar = Math.max(1, ...model.dayBars.map((d) => d.count));
  const totalSlices = model.sessionTypes.reduce((s, x) => s + x.value, 0) || 1;

  const activityValues = model.dayBars.map((day) => `${day.label} ${day.count}`).join(', ');
  const effectivenessValues = model.effectiveness
    .map((point) => `${point.label} ${point.score == null ? t('analyticsStudyBehaviorNoSample') : `${point.score}% (n=${point.sampleSize})`}`)
    .join(', ');
  const sessionTypeValues = model.sessionTypes.map((s) => `${s.label} ${s.value}`).join(', ') || '—';
  const activityAria = t('analyticsStudyBehaviorActivityAria').replace('{values}', activityValues);
  const effectivenessAria = t('analyticsStudyBehaviorEffectivenessAria').replace('{values}', effectivenessValues);
  const donutAria = t('analyticsStudyBehaviorSessionTypesAria').replace('{values}', sessionTypeValues);

  let donutAccum = 0;
  const donutSegments = model.sessionTypes.map((s) => {
    const start = donutAccum;
    const sweep = (s.value / totalSlices) * 360;
    donutAccum += sweep;
    return { ...s, start, sweep };
  });
  const effectivenessWidth = Math.max(model.effectiveness.length * 24, 120);
  const effectivenessSegments: string[][] = [];
  let currentSegment: string[] = [];
  model.effectiveness.forEach((point, index) => {
    if (point.score == null) {
      if (currentSegment.length > 0) effectivenessSegments.push(currentSegment);
      currentSegment = [];
      return;
    }
    currentSegment.push(`${12 + index * 24},${72 - (point.score / 100) * 56}`);
  });
  if (currentSegment.length > 0) effectivenessSegments.push(currentSegment);
  const hasEffectiveness = model.effectiveness.some((point) => point.score != null);

  return (
    <div className={cn('space-y-3', className)} data-testid="study-behavior-charts">
      <SectionLabel>{t('analyticsBehaviorSectionLabel')}</SectionLabel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border-0 bg-surface-card p-3" data-testid="study-behavior-bars">
          <p className="ux-section-eyebrow mb-2 type-micro font-semibold text-text-tertiary">
            {t('analyticsBehaviorActivity')}
          </p>
          <div role="img" aria-label={activityAria}>
            <div className="flex items-end gap-1 h-20 border-b border-border-subtle/50">
              {model.dayBars.map((d) => (
                <div key={d.key} className="flex-1 flex flex-col justify-end min-w-0 h-full">
                  {d.count === 0 ? (
                    <div className="w-full rounded-sm bg-surface-hover/60" style={{ height: '3px' }} title={`${d.label}: 0`} />
                  ) : (
                    <div
                      className="w-full rounded-sm bg-brand-600/75 hover:bg-brand-500/90 transition-colors"
                      style={{ height: `${Math.max(6, (d.count / maxBar) * 100)}%` }}
                      title={`${d.label}: ${d.count}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {model.dayBars.map((d) => (
                <span key={d.key} className="flex-1 type-micro text-text-muted truncate text-center">{d.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border-0 bg-surface-card p-3" data-testid="study-behavior-effectiveness">
          <p className="ux-section-eyebrow mb-2 type-micro font-semibold text-text-tertiary">
            {t('analyticsBehaviorEffectiveness')}
          </p>
          {hasEffectiveness ? (
            <svg viewBox={`0 0 ${effectivenessWidth} 92`} className="w-full" style={{ height: '6rem' }} role="img" aria-label={effectivenessAria}>
              {/* Gridlines at 25%, 50%, 75%, 100% */}
              {[0, 0.25, 0.5, 0.75, 1].map((level) => {
                const y = 16 + (1 - level) * 56;
                return (
                  <g key={level}>
                    <line x1="8" y1={y} x2={effectivenessWidth - 4} y2={y} stroke="var(--color-border-subtle)" strokeWidth={level === 0 || level === 1 ? 1 : 0.5} strokeDasharray={level === 0 || level === 1 ? undefined : '2 2'} strokeOpacity={level === 0 || level === 1 ? 0.8 : 0.4} />
                    {level > 0 && level < 1 && (
                      <text x="5" y={y + 1} textAnchor="end" dominantBaseline="middle" fontSize={6} fill="var(--color-text-tertiary)">{Math.round(level * 100)}</text>
                    )}
                  </g>
                );
              })}
              {effectivenessSegments.map((points, index) => (
                <polyline
                  key={index}
                  fill="none"
                  stroke="var(--color-accent-teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.join(' ')}
                />
              ))}
              {model.effectiveness.map((point, index) => point.score == null ? null : (
                <circle
                  key={point.key}
                  cx={12 + index * 24}
                  cy={72 - (point.score / 100) * 56}
                  r="2.5"
                  fill="var(--color-accent-teal)"
                  stroke="var(--color-surface-card)"
                  strokeWidth="1"
                >
                  <title>{`${point.label}: ${point.score}% (n=${point.sampleSize})`}</title>
                </circle>
              ))}
              {/* X-axis labels */}
              {model.effectiveness.map((point, index) => (
                <text key={`lbl-${point.key}`} x={12 + index * 24} y={80} textAnchor="middle" fontSize={6.5} fill="var(--color-text-muted)">
                  {point.label}
                </text>
              ))}
            </svg>
          ) : (
            <p className="flex h-24 items-center justify-center text-center type-micro text-text-muted" role="status">
              {t('analyticsStudyBehaviorNoEligibleRecall')}
            </p>
          )}
        </div>

        <div className="rounded-xl border-0 bg-surface-card p-3 flex items-center gap-3" data-testid="study-behavior-donut">
          <svg viewBox="0 0 42 42" className="h-20 w-20 shrink-0" role="img" aria-label={donutAria}>
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
              <li className="type-micro text-text-muted">
                {t('analyticsBehaviorNoDataInRange')}
              </li>
            ) : (
              model.sessionTypes.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 type-micro text-text-secondary">
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
