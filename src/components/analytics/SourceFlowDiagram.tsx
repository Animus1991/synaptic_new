import { useMemo } from 'react';
import type { SankeyLink } from '../../lib/knowledgeFlowAnalytics';

type Props = {
  links: SankeyLink[];
  hasData: boolean;
  ariaLabel: string;
};

const STAGES = [
  { key: 'source', label: 'Source', x: 28 },
  { key: 'parse', label: 'Parse', x: 112 },
  { key: 'study', label: 'Study', x: 196 },
  { key: 'master', label: 'Mastery', x: 280 },
] as const;

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

function flowPath(x1: number, x2: number, y: number): string {
  const mid = (x1 + x2) / 2;
  return `M${x1 + 14},${y} C${mid},${y - 12} ${mid},${y + 12} ${x2 - 14},${y}`;
}

/** Decorative source→mastery flow rail (Option-B Wave E10). */
export function SourceFlowDiagram({ links, hasData, ariaLabel }: Props) {
  const [w1, w2, w3] = useMemo(() => stagePipeWeights(links), [links]);
  const maxW = Math.max(w1, w2, w3, 1);
  const pipes = [
    { from: STAGES[0].x, to: STAGES[1].x, weight: hasData ? w1 : 1 },
    { from: STAGES[1].x, to: STAGES[2].x, weight: hasData ? w2 : 1 },
    { from: STAGES[2].x, to: STAGES[3].x, weight: hasData ? w3 : 1 },
  ];
  const y = 52;

  return (
    <svg
      viewBox="0 0 320 96"
      className="source-flow-diagram w-full h-auto"
      role="img"
      aria-label={ariaLabel}
      data-testid="source-flow-diagram"
    >
      {pipes.map((pipe, i) => {
        const strokeWidth = hasData
          ? Math.max(2, (pipe.weight / maxW) * 8)
          : 2.5;
        return (
          <path
            key={i}
            className="source-flow-pipe blueprint-stroke-gradient"
            d={flowPath(pipe.from, pipe.to, y)}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={hasData ? 0.85 : 0.45}
          />
        );
      })}

      {STAGES.map((stage) => (
        <g key={stage.key} className="source-flow-node">
          <rect
            x={stage.x - 22}
            y={y - 18}
            width={44}
            height={36}
            rx={10}
            className="source-flow-node-bg"
          />
          <text
            x={stage.x}
            y={y + 4}
            textAnchor="middle"
            className="source-flow-node-label"
          >
            {stage.label}
          </text>
        </g>
      ))}

      <circle cx={STAGES[2].x} cy={y} r={4} className="blueprint-diagram-dot" />
    </svg>
  );
}
