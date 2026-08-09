import { useMemo } from 'react';
import type { SankeyLink } from '../../features/analytics/knowledgeFlowAnalytics';

type Props = {
  links: SankeyLink[];
  hasData: boolean;
  ariaLabel: string;
};

/** Equal-width process stages — Synapse editorial rail (thin ink, wash labels). */
const STAGES = [
  { key: 'source', label: 'Source' },
  { key: 'parse', label: 'Parse' },
  { key: 'study', label: 'Study' },
  { key: 'master', label: 'Mastery' },
] as const;

const VIEW_W = 400;
const VIEW_H = 72;
const Y = 40;

function linkSum(links: SankeyLink[], from: string, to: string): number {
  return links
    .filter((l) => l.from === from && l.to === to)
    .reduce((sum, l) => sum + l.value, 0);
}

function stagePipeWeights(links: SankeyLink[]): [number, number, number] {
  const a = linkSum(links, 'Upload', 'Course built')
    || linkSum(links, 'Upload', 'Study')
    || 1;
  const b = linkSum(links, 'Course built', 'Study')
    + linkSum(links, 'Study', 'Quiz')
    || 1;
  const c = linkSum(links, 'Passed', 'Mastered')
    + linkSum(links, 'Review', 'Mastered')
    + linkSum(links, 'Quiz', 'Passed')
    || 1;
  return [a, b, c];
}

function stageCenters(): number[] {
  const pad = 36;
  const span = VIEW_W - pad * 2;
  const step = span / (STAGES.length - 1);
  return STAGES.map((_, i) => pad + step * i);
}

/** Source → mastery process rail — thin connectors + type labels (no Apple squircles). */
export function SourceFlowDiagram({ links, hasData, ariaLabel }: Props) {
  const [w1, w2, w3] = useMemo(() => stagePipeWeights(links), [links]);
  const maxW = Math.max(w1, w2, w3, 1);
  const xs = stageCenters();
  const weights = [hasData ? w1 : 1, hasData ? w2 : 1, hasData ? w3 : 1];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="source-flow-diagram w-full h-auto"
      role="img"
      aria-label={ariaLabel}
      data-testid="source-flow-diagram"
    >
      <line
        x1={xs[0]!}
        y1={Y}
        x2={xs[xs.length - 1]!}
        y2={Y}
        className="source-flow-rail"
      />

      {weights.map((weight, i) => {
        const x1 = xs[i]!;
        const x2 = xs[i + 1]!;
        const strokeWidth = hasData
          ? Math.max(1.25, (weight / maxW) * 2.25)
          : 1.25;
        return (
          <line
            key={`pipe-${i}`}
            x1={x1 + 28}
            y1={Y}
            x2={x2 - 28}
            y2={Y}
            className="source-flow-pipe"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={hasData ? 0.75 : 0.4}
          />
        );
      })}

      {STAGES.map((stage, i) => {
        const cx = xs[i]!;
        return (
          <g key={stage.key} className="source-flow-node">
            <circle cx={cx} cy={Y} r={5} className="source-flow-node-dot" />
            <text
              x={cx}
              y={Y - 14}
              textAnchor="middle"
              className="source-flow-step-index"
            >
              {i + 1}
            </text>
            <text
              x={cx}
              y={Y + 20}
              textAnchor="middle"
              className="source-flow-node-label"
            >
              {stage.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
