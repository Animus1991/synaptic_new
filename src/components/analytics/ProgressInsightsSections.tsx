import { Brain, CheckCircle2, Clock, Target, TrendingUp } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ConfidenceBucket, ProgressInsight, ProgressKpi, RadarDimension } from '../../lib/progressInsights';

const KPI_ICONS = [Brain, CheckCircle2, Target, Clock];

export function ProgressKpiRow({ kpis }: { kpis: ProgressKpi[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5" data-testid="progress-kpi-row">
      {kpis.map((kpi, i) => {
        const Icon = KPI_ICONS[i] ?? Brain;
        return (
          <div key={kpi.label} className="ux-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[10px] uppercase tracking-wide text-text-tertiary">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums text-text-primary">{kpi.value}</p>
            <p className={cn(
              'text-xs mt-1',
              kpi.tone === 'good' ? 'text-accent-emerald' : kpi.tone === 'warn' ? 'text-accent-amber' : 'text-text-tertiary',
            )}>
              {kpi.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ConfidenceBucketChart({ buckets, title }: { buckets: ConfidenceBucket[]; title: string }) {
  return (
    <div className="ux-card" data-testid="confidence-bucket-chart">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary">{bucket.label}</span>
              <span className="text-text-tertiary">{bucket.correctPct}% correct</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-surface-hover">
              <div className="bg-accent-emerald/80" style={{ width: `${bucket.correctPct}%` }} />
              <div className="bg-accent-rose/70" style={{ width: `${bucket.wrongPct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningRadarChart({ dimensions, title }: { dimensions: RadarDimension[]; title: string }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const n = dimensions.length;
  const angleStep = (Math.PI * 2) / n;

  const pointAt = (i: number, radius: number) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };

  const dataPoints = dimensions.map((d, i) => {
    const p = pointAt(i, (d.score / 100) * r);
    return `${p.x},${p.y}`;
  }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="ux-card flex flex-col items-center" data-testid="learning-radar-chart">
      <h3 className="text-sm font-semibold text-text-primary mb-4 self-start flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={dimensions.map((_, i) => {
              const p = pointAt(i, r * level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={1}
          />
        ))}
        {dimensions.map((d, i) => {
          const outer = pointAt(i, r);
          const inner = pointAt(i, r * 0.15);
          return <line key={d.subject} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--color-border-subtle)" />;
        })}
        <polygon points={dataPoints} fill="color-mix(in srgb, var(--color-brand-500) 25%, transparent)" stroke="var(--color-brand-400)" strokeWidth={2} />
        {dimensions.map((d, i) => {
          const label = pointAt(i, r + 18);
          return (
            <text key={d.subject} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-text-tertiary" fontSize={9}>
              {d.subject.split(' ')[0]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function LearnerInsightCards({ insights, title }: { insights: ProgressInsight[]; title: string }) {
  return (
    <div className="ux-card" data-testid="learner-insight-cards">
      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={cn(
              'p-3 rounded-xl border',
              ins.tone === 'good' ? 'border-accent-emerald/20 bg-accent-emerald/5' :
              ins.tone === 'warn' ? 'border-accent-amber/20 bg-accent-amber/5' :
              'border-border-subtle bg-surface-hover/40',
            )}
          >
            <p className="text-sm font-medium text-text-primary">{ins.insight}</p>
            <p className="text-xs text-text-tertiary mt-1">{ins.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
