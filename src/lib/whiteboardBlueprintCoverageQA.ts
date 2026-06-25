/**
 * Wave 6.8g — QA spine for Whiteboard diagram coach blueprint coverage.
 */

import type { Lang } from './i18n';
import {
  buildDiagramCoachPlan,
  buildWhiteboardDiagramAgentPrompt,
  inferDiagramBlueprintKind,
  type DiagramBlueprintKind,
  type DiagramCoachPlan,
  type DiagramCoachToolHint,
} from './whiteboardDiagramCoach';

export const ALL_BLUEPRINT_KINDS: DiagramBlueprintKind[] = [
  'concept-map',
  'causal-flow',
  'compare-contrast',
  'formula-web',
  'process-cycle',
];

export type BlueprintContextEdge =
  | 'sparse-context'
  | 'formula-rich'
  | 'graph-rich'
  | 'contrast-pair'
  | 'weak-focus'
  | 'empty-excerpt'
  | 'section-grounded';

export type BlueprintCoverageIssue = {
  code: 'missing-steps' | 'missing-labels' | 'short-agent-prompt' | 'kind-unreachable' | 'tool-hint-gap';
  message: string;
};

export type BlueprintKindCoverage = {
  kind: DiagramBlueprintKind;
  reachable: boolean;
  stepCount: number;
  labeledStepCount: number;
  toolHints: DiagramCoachToolHint[];
  agentGuideChars: number;
};

export type WhiteboardBlueprintCoverageReport = {
  ok: boolean;
  activeKind: DiagramBlueprintKind;
  contextEdge: BlueprintContextEdge;
  stepCount: number;
  labeledStepCount: number;
  nodeLabelCount: number;
  toolHintCount: number;
  agentGuideReady: boolean;
  issues: BlueprintCoverageIssue[];
  matrix: BlueprintKindCoverage[];
  bannerSummary: string | null;
};

const MIN_STEPS = 3;
const MIN_AGENT_PROMPT = 80;

export function classifyBlueprintContext(input: {
  formulaCount: number;
  relatedCount: number;
  contrastPair?: [string, string];
  weakFocus?: string;
  referenceExcerpt?: string;
  sectionLabel?: string;
}): BlueprintContextEdge {
  if (input.contrastPair) return 'contrast-pair';
  if (input.weakFocus?.trim()) return 'weak-focus';
  if (input.formulaCount >= 2) return 'formula-rich';
  if (input.relatedCount >= 3) return 'graph-rich';
  if (!input.referenceExcerpt?.trim()) return 'empty-excerpt';
  if (input.sectionLabel?.trim()) return 'section-grounded';
  return 'sparse-context';
}

function coverageForPlan(plan: DiagramCoachPlan, lang: Lang): BlueprintKindCoverage {
  const toolHints = [...new Set(plan.steps.map((s) => s.toolHint))];
  const labeledStepCount = plan.steps.filter((s) => s.boardLabel?.trim()).length;
  const agentGuideChars = buildWhiteboardDiagramAgentPrompt(plan, lang, 'guide').length;
  return {
    kind: plan.kind,
    reachable: true,
    stepCount: plan.steps.length,
    labeledStepCount,
    toolHints,
    agentGuideChars,
  };
}

/** Synthetic plan per blueprint kind to verify template coverage. */
export function buildSyntheticPlanForKind(kind: DiagramBlueprintKind, lang: Lang): DiagramCoachPlan {
  const base = {
    concept: 'Elasticity',
    lang,
    sectionLabel: 'Markets',
    referenceExcerpt: 'Price elasticity measures consumer responsiveness to price changes.',
  };

  switch (kind) {
    case 'formula-web':
      return buildDiagramCoachPlan({
        ...base,
        formulas: [
          { id: 'f1', name: 'Elasticity', formula: 'E = \\frac{dQ}{dP}' },
          { id: 'f2', name: 'Revenue', formula: 'R = P \\cdot Q' },
        ],
      });
    case 'compare-contrast':
      return buildDiagramCoachPlan({
        ...base,
        contrastPair: ['Elastic demand', 'Inelastic demand'],
        relatedConcepts: ['Elastic demand', 'Inelastic demand'],
      });
    case 'concept-map':
      return buildDiagramCoachPlan({
        ...base,
        relatedConcepts: ['Demand', 'Supply', 'Surplus', 'Tax incidence'],
        prerequisiteConcepts: ['Price'],
      });
    case 'causal-flow':
      return buildDiagramCoachPlan({
        ...base,
        relatedConcepts: ['Consumer surplus'],
      });
    case 'process-cycle':
    default:
      return buildDiagramCoachPlan({ ...base, relatedConcepts: [] });
  }
}

export function buildBlueprintCoverageMatrix(lang: Lang): BlueprintKindCoverage[] {
  return ALL_BLUEPRINT_KINDS.map((kind) => {
    const plan = buildSyntheticPlanForKind(kind, lang);
    return coverageForPlan(plan, lang);
  });
}

export function inferKindReachability(): Record<DiagramBlueprintKind, boolean> {
  const checks: Record<DiagramBlueprintKind, boolean> = {
    'formula-web': inferDiagramBlueprintKind({ formulaCount: 2, relatedCount: 0 }) === 'formula-web',
    'compare-contrast': inferDiagramBlueprintKind({
      formulaCount: 0,
      relatedCount: 0,
      contrastPair: ['A', 'B'],
    }) === 'compare-contrast',
    'concept-map': inferDiagramBlueprintKind({ formulaCount: 0, relatedCount: 4 }) === 'concept-map',
    'causal-flow': inferDiagramBlueprintKind({ formulaCount: 0, relatedCount: 1 }) === 'causal-flow',
    'process-cycle': inferDiagramBlueprintKind({ formulaCount: 0, relatedCount: 0 }) === 'process-cycle',
  };
  return checks;
}

export function auditWhiteboardBlueprintCoverage(input: {
  plan: DiagramCoachPlan;
  lang: Lang;
  formulaCount?: number;
  relatedCount?: number;
  contrastPair?: [string, string];
  weakFocus?: string;
  referenceExcerpt?: string;
  sectionLabel?: string;
}): WhiteboardBlueprintCoverageReport {
  const issues: BlueprintCoverageIssue[] = [];
  const matrix = buildBlueprintCoverageMatrix(input.lang);
  const reachability = inferKindReachability();

  for (const kind of ALL_BLUEPRINT_KINDS) {
    if (!reachability[kind]) {
      issues.push({
        code: 'kind-unreachable',
        message: `Blueprint kind "${kind}" is not reachable via inferDiagramBlueprintKind`,
      });
    }
  }

  const stepCount = input.plan.steps.length;
  const labeledStepCount = input.plan.steps.filter((s) => s.boardLabel?.trim()).length;
  const toolHints = new Set(input.plan.steps.map((s) => s.toolHint));
  const agentPrompt = buildWhiteboardDiagramAgentPrompt(input.plan, input.lang, 'guide');
  const agentGuideReady = agentPrompt.length >= MIN_AGENT_PROMPT;

  if (stepCount < MIN_STEPS) {
    issues.push({
      code: 'missing-steps',
      message: `Plan has ${stepCount} steps; expected at least ${MIN_STEPS}`,
    });
  }
  if (labeledStepCount === 0 && input.plan.nodeLabels.length === 0) {
    issues.push({
      code: 'missing-labels',
      message: 'No board labels or node labels for canvas insertion',
    });
  }
  if (!agentGuideReady) {
    issues.push({
      code: 'short-agent-prompt',
      message: 'Agent guide prompt is too short for coaching',
    });
  }

  for (const row of matrix) {
    if (row.stepCount < MIN_STEPS) {
      issues.push({
        code: 'missing-steps',
        message: `Template "${row.kind}" has only ${row.stepCount} steps`,
      });
    }
    if (row.toolHints.length < 2) {
      issues.push({
        code: 'tool-hint-gap',
        message: `Template "${row.kind}" uses fewer than 2 tool hints`,
      });
    }
  }

  const contextEdge = classifyBlueprintContext({
    formulaCount: input.formulaCount ?? 0,
    relatedCount: input.relatedCount ?? input.plan.nodeLabels.length,
    contrastPair: input.contrastPair,
    weakFocus: input.weakFocus ?? input.plan.weakFocus,
    referenceExcerpt: input.referenceExcerpt,
    sectionLabel: input.sectionLabel,
  });

  const bannerSummary = formatBlueprintCoverageBanner({
    kind: input.plan.kind,
    stepCount,
    nodeLabelCount: input.plan.nodeLabels.length,
    contextEdge,
    agentGuideReady,
    lang: input.lang,
  });

  return {
    ok: issues.length === 0,
    activeKind: input.plan.kind,
    contextEdge,
    stepCount,
    labeledStepCount,
    nodeLabelCount: input.plan.nodeLabels.length,
    toolHintCount: toolHints.size,
    agentGuideReady,
    issues,
    matrix,
    bannerSummary,
  };
}

export function formatBlueprintCoverageBanner(input: {
  kind: DiagramBlueprintKind;
  stepCount: number;
  nodeLabelCount: number;
  contextEdge: BlueprintContextEdge;
  agentGuideReady: boolean;
  lang: Lang;
}): string | null {
  const isEl = input.lang === 'el';
  const parts: string[] = [
    input.kind.replace(/-/g, ' '),
    isEl ? `${input.stepCount} βήματα` : `${input.stepCount} steps`,
  ];
  if (input.nodeLabelCount > 0) {
    parts.push(isEl ? `${input.nodeLabelCount} ετικέτες` : `${input.nodeLabelCount} labels`);
  }
  if (input.agentGuideReady) {
    parts.push(isEl ? 'Agent έτοιμο' : 'Agent ready');
  }
  if (input.contextEdge === 'sparse-context') {
    parts.push(isEl ? 'sparse' : 'sparse');
  }
  return parts.join(' · ');
}

export function blueprintKindLabel(kind: DiagramBlueprintKind, lang: Lang): string {
  const en: Record<DiagramBlueprintKind, string> = {
    'concept-map': 'Concept map',
    'causal-flow': 'Causal flow',
    'compare-contrast': 'Compare',
    'formula-web': 'Formula web',
    'process-cycle': 'Process cycle',
  };
  const el: Record<DiagramBlueprintKind, string> = {
    'concept-map': 'Χάρτης εννοιών',
    'causal-flow': 'Ροή αιτίας',
    'compare-contrast': 'Σύγκριση',
    'formula-web': 'Δίκτυο τύπων',
    'process-cycle': 'Κύκλος',
  };
  return (lang === 'el' ? el : en)[kind];
}

export function blueprintContextHint(edge: BlueprintContextEdge, lang: Lang): string | null {
  const hints: Partial<Record<BlueprintContextEdge, { en: string; el: string }>> = {
    'sparse-context': {
      en: 'Few related terms — process-cycle or causal-flow blueprint.',
      el: 'Λίγοι σχετικοί όροι — process-cycle ή causal-flow blueprint.',
    },
    'empty-excerpt': {
      en: 'No excerpt — labels come from concept graph only.',
      el: 'Χωρίς απόσπασμα — ετικέτες μόνο από concept graph.',
    },
    'weak-focus': {
      en: 'Weak-area focus may prefer compare-contrast layout.',
      el: 'Αδυναμία — μπορεί να προτιμά compare-contrast.',
    },
  };
  const row = hints[edge];
  if (!row) return null;
  return lang === 'el' ? row.el : row.en;
}
