import { asAllCapsLabel } from '../../lib/greekTypography';
import type { SkillNode } from '../../types';

/**
 * Decorative SVG boards for Analytics Visual Lab.
 * Synapse wash/ink — no neon squircles, glow dots, or Apple-style gradient ribbons.
 * Concept / mastery boards prefer live learner data when present.
 */

const CONCEPT_LAYOUT = [
  { id: 'a', x: 18, y: 30 },
  { id: 'b', x: 52, y: 20 },
  { id: 'c', x: 38, y: 54 },
  { id: 'd', x: 74, y: 44 },
] as const;

const CONCEPT_EDGES = [
  ['a', 'b'],
  ['a', 'd'],
  ['c', 'd'],
] as const;

const FALLBACK_LABELS = ['Ref point', 'Loss aversion', 'Anchoring', 'Framing'] as const;

function truncateLabel(label: string, max = 16): string {
  const trimmed = label.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function ConceptGraphDecorativeBoard({ skills = [] }: { skills?: SkillNode[] }) {
  const live = skills.slice(0, 4);
  const shown = CONCEPT_LAYOUT.slice(0, live.length > 0 ? live.length : 4).map((slot, i) => ({
    ...slot,
    label: truncateLabel(live[i]?.concept ?? FALLBACK_LABELS[i]!),
  }));

  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="12" className="visual-lab-board-bg" />
      {CONCEPT_EDGES.filter(([from, to]) => shown.some((n) => n.id === from) && shown.some((n) => n.id === to)).map(([from, to]) => {
        const a = shown.find((n) => n.id === from)!;
        const b = shown.find((n) => n.id === to)!;
        return (
          <line
            key={`${from}-${to}`}
            x1={`${a.x}%`}
            y1={`${a.y}%`}
            x2={`${b.x}%`}
            y2={`${b.y}%`}
            className="visual-lab-edge"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      {shown.map((node) => (
        <g key={node.id}>
          <circle cx={`${node.x}%`} cy={`${node.y}%`} r="11" className="visual-lab-concept-node" />
          <text x={`${node.x}%`} y={`${node.y + 12}%`} textAnchor="middle" className="visual-lab-node-label">
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MasteryRingDecorativeBoard({
  mastery = 0,
  label = 'Exam readiness',
}: {
  mastery?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(mastery)));
  const rings = [
    { pct, r: 56 },
    { pct: Math.round(pct * 0.82), r: 42 },
    { pct: Math.round(pct * 0.64), r: 28 },
  ];
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="12" className="visual-lab-board-bg" />
      {rings.map((ring, i) => {
        const c = 2 * Math.PI * ring.r;
        return (
          <circle
            key={i}
            cx="160"
            cy="100"
            r={ring.r}
            fill="none"
            className="visual-lab-ring-track"
            strokeWidth="7"
            strokeDasharray={c}
            strokeDashoffset={0}
            opacity={0.22}
          />
        );
      })}
      {rings.map((ring, i) => {
        const c = 2 * Math.PI * ring.r;
        const offset = c - (ring.pct / 100) * c;
        return (
          <circle
            key={`fill-${i}`}
            cx="160"
            cy="100"
            r={ring.r}
            fill="none"
            className="visual-lab-ring-fill"
            strokeWidth="7"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 160 100)"
            opacity={0.95 - i * 0.18}
          />
        );
      })}
      <text x="160" y="96" textAnchor="middle" className="visual-lab-mastery-value">{pct}%</text>
      <text x="160" y="116" textAnchor="middle" className="visual-lab-mastery-label">{asAllCapsLabel(label)}</text>
    </svg>
  );
}

export function ExamPathDecorativeBoard({
  steps = [
    { x: 44, label: 'Warmup' },
    { x: 116, label: 'Core' },
    { x: 188, label: 'Repair' },
    { x: 260, label: 'Sim' },
  ],
}: {
  steps?: Array<{ x: number; label: string }>;
}) {
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="12" className="visual-lab-board-bg" />
      <line
        x1={steps[0]!.x}
        y1={100}
        x2={steps[steps.length - 1]!.x}
        y2={100}
        className="visual-lab-exam-path"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {steps.map((step, i) => (
        <g key={`${step.label}-${i}`}>
          <circle
            cx={step.x}
            cy={100}
            r={i === 1 ? 9 : 7}
            className={i === 1 ? 'visual-lab-exam-node-active' : 'visual-lab-exam-node'}
          />
          <text x={step.x} y={132} textAnchor="middle" className="visual-lab-node-label">
            {step.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function FormulaDecorativeBoard({ caption }: { caption?: string }) {
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="12" className="visual-lab-board-bg" />
      <text x="160" y="72" textAnchor="middle" className="visual-lab-formula-main">y = β₀ + β₁x + ε</text>
      <rect x="48" y="96" width="88" height="36" rx="8" className="visual-lab-formula-chip" />
      <text x="92" y="118" textAnchor="middle" className="visual-lab-formula-chip-label">β₁ slope</text>
      <rect x="184" y="96" width="88" height="36" rx="8" className="visual-lab-formula-chip" />
      <text x="228" y="118" textAnchor="middle" className="visual-lab-formula-chip-label">ε error</text>
      <line x1="160" y1="148" x2="160" y2="168" className="visual-lab-edge" strokeWidth="1.5" />
      <text x="160" y="186" textAnchor="middle" className="visual-lab-node-label">
        {caption ?? 'Interpret coefficients in plain language'}
      </text>
    </svg>
  );
}
