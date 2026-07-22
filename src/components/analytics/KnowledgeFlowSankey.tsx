import { useMemo } from 'react';
import { GitBranch } from '@/lib/lucide-shim';
import type { SankeyLink } from '../../lib/knowledgeFlowAnalytics';
import { sankeyNodeLayout, SANKEY_NODE_ORDER } from '../../lib/knowledgeFlowAnalytics';
import { cn } from '../../utils/cn';

type Props = {
  links: SankeyLink[];
  title: string;
  hint: string;
  emptyLabel: string;
  hasData: boolean;
};

export function KnowledgeFlowSankeyChart({ links, title, hint, emptyLabel, hasData }: Props) {
  const layout = useMemo(() => sankeyNodeLayout(), []);
  const maxCol = 6;
  const nodeNames = useMemo(
    () => [...new Set(links.flatMap((l) => [l.from, l.to]))],
    [links],
  );

  if (!hasData || links.length === 0) {
    return (
      <div className="ux-card blueprint-surface flex flex-col items-center justify-center min-h-[220px] text-center" data-testid="knowledge-flow-sankey-empty">
        <GitBranch className="w-8 h-8 text-text-tertiary mb-2" />
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="ux-card blueprint-surface" data-testid="knowledge-flow-sankey">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <p className="text-xs text-text-tertiary mb-4">{hint}</p>
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-primary/40 p-3">
        <svg viewBox="0 0 1000 240" className="h-[280px] w-full min-w-[640px]" role="img" aria-label={title}>
          {links.map((link) => {
            const from = layout[link.from as keyof typeof layout];
            const to = layout[link.to as keyof typeof layout];
            if (!from || !to) return null;
            const x1 = (from.col / maxCol) * 920 + 40;
            const x2 = (to.col / maxCol) * 920 + 40;
            const y1 = (from.y / 100) * 220;
            const y2 = (to.y / 100) * 220;
            const thickness = Math.max(2.5, link.value / 8);
            return (
              <path
                key={`${link.from}-${link.to}`}
                d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                fill="none"
                stroke={link.color}
                strokeWidth={thickness}
                strokeOpacity={0.45}
                strokeLinecap="round"
              />
            );
          })}
          {SANKEY_NODE_ORDER.filter((n) => nodeNames.includes(n)).map((name) => {
            const slot = layout[name];
            const cx = (slot.col / maxCol) * 920 + 40;
            const cy = (slot.y / 100) * 220;
            const tone =
              name.includes('Failed') || name.includes('Repair')
                ? 'var(--palette-rose)'
                : name.includes('Mastered') || name.includes('Passed')
                  ? 'var(--palette-green)'
                  : name.includes('Review')
                    ? 'var(--palette-amber)'
                    : 'var(--palette-cyan)';
            return (
              <g key={name}>
                <circle cx={cx} cy={cy} r={14} fill={tone} opacity={0.16} />
                <circle cx={cx} cy={cy} r={7} fill={tone} opacity={0.9} />
                <text x={cx} y={cy + 24} textAnchor="middle" className="fill-text-secondary text-[10px] font-medium">
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function MasteryWaterfallChart({
  steps,
  title,
  hint,
  emptyLabel,
  hasData,
}: {
  steps: import('../../lib/knowledgeFlowAnalytics').WaterfallStep[];
  title: string;
  hint: string;
  emptyLabel: string;
  hasData: boolean;
}) {
  const cumulative = useMemo(() => {
    let running = 0;
    return steps.map((step) => {
      const start = running;
      running += step.delta;
      return { ...step, start, end: running };
    });
  }, [steps]);

  const maxVal = Math.max(...cumulative.map((c) => Math.max(c.start, c.end)), 1);

  if (!hasData || cumulative.length === 0) {
    return (
      <div className="ux-card blueprint-surface flex flex-col items-center justify-center min-h-[220px] text-center" data-testid="mastery-waterfall-empty">
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="ux-card blueprint-surface" data-testid="mastery-waterfall">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-tertiary mb-4">{hint}</p>
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-primary/40 p-3">
        <svg viewBox="0 0 780 280" className="h-[280px] w-full min-w-[520px]" role="img" aria-label={title}>
          {cumulative.map((step, i) => {
            const x = i * (780 / cumulative.length) + 12;
            const w = 780 / cumulative.length - 16;
            const top = 230 - (Math.max(step.start, step.end) / maxVal) * 190;
            const bottom = 230 - (Math.min(step.start, step.end) / maxVal) * 190;
            const h = Math.max(4, bottom - top);
            const isGain = step.delta >= 0;
            const fill =
              step.type === 'neutral'
                ? 'var(--color-brand-500)'
                : isGain
                  ? 'var(--palette-green)'
                  : 'var(--palette-rose)';
            return (
              <g key={`${step.label}-${i}`}>
                <rect
                  x={x}
                  y={top}
                  width={w}
                  height={h}
                  rx={6}
                  fill={fill}
                  opacity={0.78}
                  className="waterfall-bar transition-opacity duration-200 hover:opacity-100"
                />
                <text
                  x={x + w / 2}
                  y={top - 8}
                  textAnchor="middle"
                  style={{
                    fill:
                      step.type === 'neutral'
                        ? 'var(--color-brand-400)'
                        : isGain
                          ? 'var(--color-accent-emerald)'
                          : 'var(--color-accent-rose)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {isGain && step.delta > 0 ? '+' : ''}
                  {step.delta}
                </text>
                <text x={x + w / 2} y={252} textAnchor="middle" className="fill-text-muted text-[10px]">
                  {step.label.length > 14 ? `${step.label.slice(0, 12)}…` : step.label}
                </text>
                {i > 0 && (
                  <line
                    x1={x - 8}
                    y1={230 - (step.start / maxVal) * 190}
                    x2={x + 4}
                    y2={230 - (step.start / maxVal) * 190}
                    stroke="var(--color-border-default)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.6}
                  />
                )}
              </g>
            );
          })}
          <line x1={0} y1={230} x2={780} y2={230} stroke="var(--color-border-subtle)" strokeWidth={1} />
        </svg>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {cumulative.slice(-4).map((s) => (
          <div
            key={s.label}
            className={cn(
              'rounded-xl border p-3 text-xs',
              s.delta >= 0 ? 'border-accent-emerald/25 bg-accent-emerald/5' : 'border-accent-rose/25 bg-accent-rose/5',
            )}
          >
            <div className="font-semibold text-text-primary">
              {s.delta >= 0 ? '+' : ''}
              {s.delta} — {s.label}
            </div>
            <div className="mt-1 text-text-tertiary leading-relaxed">{s.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
