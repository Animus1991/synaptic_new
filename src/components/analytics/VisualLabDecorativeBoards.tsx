/** Decorative SVG boards for Analytics Visual Lab mode rail (Wave E14). */

const TONE: Record<string, string> = {
  cyan: 'var(--palette-cyan)',
  violet: 'var(--palette-purple)',
  emerald: 'var(--palette-green)',
  amber: 'var(--palette-amber)',
};

const CONCEPT_NODES = [
  { id: 'a', label: 'Ref point', x: 18, y: 28, tone: 'cyan' },
  { id: 'b', label: 'Loss aversion', x: 52, y: 18, tone: 'violet' },
  { id: 'c', label: 'Anchoring', x: 38, y: 52, tone: 'amber' },
  { id: 'd', label: 'Framing', x: 72, y: 42, tone: 'emerald' },
] as const;

const CONCEPT_EDGES = [
  ['a', 'b'],
  ['a', 'd'],
  ['c', 'd'],
] as const;

export function ConceptGraphDecorativeBoard() {
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="20" className="visual-lab-board-bg" />
      {CONCEPT_EDGES.map(([from, to]) => {
        const a = CONCEPT_NODES.find((n) => n.id === from)!;
        const b = CONCEPT_NODES.find((n) => n.id === to)!;
        return (
          <line
            key={`${from}-${to}`}
            x1={`${a.x}%`}
            y1={`${a.y}%`}
            x2={`${b.x}%`}
            y2={`${b.y}%`}
            className="visual-lab-edge"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      {CONCEPT_NODES.map((node) => (
        <g key={node.id}>
          <circle cx={`${node.x}%`} cy={`${node.y}%`} r="18" fill={TONE[node.tone]} opacity="0.2" />
          <circle cx={`${node.x}%`} cy={`${node.y}%`} r="12" fill={TONE[node.tone]} opacity="0.75" />
          <text x={`${node.x}%`} y={`${node.y + 14}%`} textAnchor="middle" className="visual-lab-node-label">
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MasteryRingDecorativeBoard() {
  const rings = [
    { pct: 82, r: 58, color: 'var(--mastery-strong)' },
    { pct: 61, r: 44, color: 'var(--palette-cyan)' },
    { pct: 48, r: 30, color: 'var(--palette-amber)' },
  ];
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="20" className="visual-lab-board-bg" />
      {rings.map((ring, i) => {
        const c = 2 * Math.PI * ring.r;
        const offset = c - (ring.pct / 100) * c;
        return (
          <circle
            key={i}
            cx="160"
            cy="100"
            r={ring.r}
            fill="none"
            stroke={ring.color}
            strokeWidth="10"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 160 100)"
            opacity={0.85 - i * 0.12}
          />
        );
      })}
      <text x="160" y="96" textAnchor="middle" className="visual-lab-mastery-value">68%</text>
      <text x="160" y="118" textAnchor="middle" className="visual-lab-mastery-label">Exam readiness</text>
    </svg>
  );
}

export function ExamPathDecorativeBoard() {
  const steps = [
    { x: 40, label: 'Warmup' },
    { x: 110, label: 'Core' },
    { x: 180, label: 'Repair' },
    { x: 250, label: 'Sim' },
  ];
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="20" className="visual-lab-board-bg" />
      <path
        d="M 40 100 L 110 100 L 180 100 L 250 100"
        className="visual-lab-exam-path blueprint-stroke-gradient"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {steps.map((step, i) => (
        <g key={step.label}>
          <circle
            cx={step.x}
            cy={100}
            r={i === 1 ? 14 : 10}
            className={i === 1 ? 'visual-lab-exam-node-active' : 'visual-lab-exam-node'}
          />
          <text x={step.x} y={138} textAnchor="middle" className="visual-lab-node-label">
            {step.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function FormulaDecorativeBoard() {
  return (
    <svg viewBox="0 0 320 200" className="visual-lab-board w-full h-auto" role="img" aria-hidden>
      <rect x="0" y="0" width="320" height="200" rx="20" className="visual-lab-board-bg" />
      <text x="160" y="72" textAnchor="middle" className="visual-lab-formula-main">y = β₀ + β₁x + ε</text>
      <rect x="48" y="96" width="88" height="36" rx="10" className="visual-lab-formula-chip" />
      <text x="92" y="118" textAnchor="middle" className="visual-lab-formula-chip-label">β₁ slope</text>
      <rect x="184" y="96" width="88" height="36" rx="10" className="visual-lab-formula-chip" />
      <text x="228" y="118" textAnchor="middle" className="visual-lab-formula-chip-label">ε error</text>
      <line x1="160" y1="148" x2="160" y2="168" className="visual-lab-edge" strokeWidth="2" />
      <text x="160" y="186" textAnchor="middle" className="visual-lab-node-label">Interpret coefficients in plain language</text>
    </svg>
  );
}
