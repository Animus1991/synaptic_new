import { AlertTriangle, Brain, CheckCircle2, Clock, Target, TrendingUp } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ConfidenceBucket, ProgressInsight, ProgressKpi, RadarDimension } from '../../lib/progressInsights';
import { useMinimalTheme } from '../../lib/useMinimalTheme';
import { HubSection, UtilityRow } from '../ui/UtilityPrimitives';
import { AllCapsLabel } from '../ui/AllCapsLabel';

const KPI_ICONS = [Brain, CheckCircle2, Target, Clock];

function parseTrailingPct(value: string): number | undefined {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!m) return undefined;
  return Number(m[1]);
}

export function ProgressKpiRow({ kpis }: { kpis: ProgressKpi[] }) {
  const isMinimal = useMinimalTheme();

  // OPT-K5/K6 — Spending-like stacked rows under Minimal; Blueprint keeps KPI cards.
  if (isMinimal) {
    return (
      <HubSection className="progress-kpi-stack" data-testid="progress-kpi-row">
        <div className="progress-kpi-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-2">
          {kpis.map((kpi, i) => {
            const Icon = KPI_ICONS[i] ?? Brain;
            return (
              <UtilityRow
                key={kpi.label}
                icon={<Icon />}
                label={kpi.label}
                value={kpi.value}
                hint={
                  <span data-tone={kpi.tone ?? 'neutral'}>{kpi.sub}</span>
                }
                barPct={parseTrailingPct(kpi.value)}
              />
            );
          })}
        </div>
      </HubSection>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5" data-testid="progress-kpi-row">
      {kpis.map((kpi, i) => {
        const Icon = KPI_ICONS[i] ?? Brain;
        const accentColor =
          kpi.tone === 'good'
            ? 'var(--color-accent-emerald)'
            : kpi.tone === 'warn'
              ? 'var(--color-accent-amber)'
              : 'var(--color-text-tertiary)';
        return (
          <div
            key={kpi.label}
            className="ux-card border-0 bg-surface-secondary/50 p-3.5 min-h-[5.5rem] flex flex-col justify-between gap-1 overflow-hidden relative"
          >
            {/* Tone accent stripe */}
            {(kpi.tone === 'good' || kpi.tone === 'warn') && (
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              />
            )}
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} aria-hidden />
              <span className="type-micro font-medium text-text-muted truncate leading-none"><AllCapsLabel>{kpi.label}</AllCapsLabel></span>
            </div>
            <p className="ux-kpi-value-sm leading-none tabular-nums">{kpi.value}</p>
            <p className={cn(
              'type-micro leading-snug',
              kpi.tone === 'good' || kpi.tone === 'warn' ? 'ink-allow-accent' : null,
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
    <div className="ux-card p-3" data-testid="confidence-bucket-chart">
      <h3 className="type-caption font-semibold text-text-secondary mb-3"><AllCapsLabel>{title}</AllCapsLabel></h3>
      {/* K-A01: dense horizontal 5-bin calibration (mockup) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {buckets.map((bucket) => (
          <div
            key={bucket.rangeLabel}
            className="min-w-0 rounded-lg border-0 bg-surface-secondary/50 px-1 py-2 text-center"
          >
            <p className="type-meta font-bold tabular-nums text-text-primary">
              {bucket.sampleCount === 0 ? '—' : `${bucket.correctPct}%`}
            </p>
            <p className="mt-0.5 type-micro text-text-muted tabular-nums truncate">{bucket.rangeLabel}</p>
            <p className="mt-0.5 type-micro text-text-tertiary tabular-nums">n={bucket.sampleCount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningRadarChart({ dimensions, title }: { dimensions: RadarDimension[]; title: string }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
  const n = dimensions.length;
  const angleStep = (Math.PI * 2) / n;

  const pointAt = (i: number, radius: number) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };

  const dataPoints = dimensions.map((d, i) => {
    const p = pointAt(i, Math.max(4, (d.score / 100) * r));
    return `${p.x},${p.y}`;
  }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="ux-card flex flex-col items-center" data-testid="learning-radar-chart">
      <h3 className="type-meta font-semibold text-text-primary mb-3 self-start flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-text-secondary" aria-hidden />
        {title}
      </h3>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full"
        role="img"
        aria-label={`${title}: ${dimensions.map((dimension) => `${dimension.subject} ${dimension.score}%`).join(', ')}`}
      >
        {/* Grid rings */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={dimensions.map((_, i) => {
              const p = pointAt(i, r * level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill={level === 1 ? 'var(--color-surface-secondary)' : 'none'}
            fillOpacity={level === 1 ? 0.3 : 0}
            stroke="var(--color-border-subtle)"
            strokeWidth={level === 1 ? 1.5 : 0.8}
            strokeOpacity={level === 1 ? 0.8 : 0.5}
          />
        ))}
        {/* Axis lines */}
        {dimensions.map((d, i) => {
          const outer = pointAt(i, r);
          const inner = pointAt(i, r * 0.1);
          return <line key={d.subject} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--color-border-subtle)" strokeWidth={0.8} strokeOpacity={0.6} />;
        })}
        {/* Data polygon fill */}
        <polygon
          points={dataPoints}
          fill="var(--color-brand-500)"
          fillOpacity={0.18}
          stroke="var(--color-brand-400)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Data point dots */}
        {dimensions.map((d, i) => {
          const p = pointAt(i, Math.max(4, (d.score / 100) * r));
          return (
            <circle key={`dot-${d.subject}`} cx={p.x} cy={p.y} r={3} fill="var(--color-brand-400)" stroke="var(--color-surface-primary)" strokeWidth={1.5}>
              <title>{d.subject}: {d.score}%</title>
            </circle>
          );
        })}
        {/* Axis labels */}
        {dimensions.map((d, i) => {
          const label = pointAt(i, r + 20);
          return (
            <text key={d.subject} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-text-tertiary" fontSize={9.5} fontWeight={500}>
              {d.subject.split(' ')[0]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function insightIcon(tone: string | undefined) {
  if (tone === 'good') return CheckCircle2;
  if (tone === 'warn') return AlertTriangle;
  return Brain;
}

function insightAccent(tone: string | undefined): string {
  if (tone === 'good') return 'var(--color-accent-emerald)';
  if (tone === 'warn') return 'var(--color-accent-amber)';
  return 'var(--color-text-tertiary)';
}

export function LearnerInsightCards({ insights, title }: { insights: ProgressInsight[]; title: string }) {
  return (
    <div className="ux-card" data-testid="learner-insight-cards">
      <h3 className="type-meta font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-text-secondary" aria-hidden />
        {title}
      </h3>
      <div className="space-y-2.5">
        {insights.map((ins, i) => {
          const Icon = insightIcon(ins.tone);
          const accent = insightAccent(ins.tone);
          return (
            <div
              key={i}
              className={cn(
                'relative pl-4 pr-3 py-3 rounded-xl overflow-hidden',
                ins.tone === 'good' ? 'bg-accent-emerald/5' :
                ins.tone === 'warn' ? 'bg-accent-amber/5' :
                'bg-surface-secondary/50',
              )}
            >
              {/* Tone accent stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: accent }} aria-hidden />
              <div className="flex items-start gap-2">
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} aria-hidden />
                <div className="min-w-0">
                  <p className="type-body font-medium text-text-primary leading-snug">{ins.insight}</p>
                  <p className="type-caption text-text-tertiary mt-1 leading-snug">{ins.evidence}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
