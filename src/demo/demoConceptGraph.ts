import type { ConceptGraph } from '../lib/conceptGraph';

/** Pre-mined typed graph for demo course c1 (Microeconomics). */
export const DEMO_C1_CONCEPT_GRAPH: ConceptGraph = {
  valid: true,
  order: [
    'supply demand',
    'consumer theory',
    'elasticity',
    'market structures',
    'welfare economics',
    'game theory basics',
  ],
  nodes: [
    { id: 'concept-0', label: 'Supply & Demand', key: 'supply demand', salience: 1, tier: 1 },
    { id: 'concept-1', label: 'Consumer Theory', key: 'consumer theory', salience: 0.92, tier: 2 },
    { id: 'concept-2', label: 'Elasticity', key: 'elasticity', salience: 0.88, tier: 2 },
    { id: 'concept-3', label: 'Market Structures', key: 'market structures', salience: 0.85, tier: 3 },
    { id: 'concept-4', label: 'Welfare Economics', key: 'welfare economics', salience: 0.8, tier: 3 },
    { id: 'concept-5', label: 'Game Theory Basics', key: 'game theory basics', salience: 0.75, tier: 4 },
  ],
  edges: [
    {
      id: 'edge-0',
      source: 'supply demand',
      target: 'consumer theory',
      type: 'prerequisite',
      evidence: 'Consumers are modelled as choosing the bundle of goods that maximises utility subject to a budget constraint.',
      weight: 0.9,
    },
    {
      id: 'edge-1',
      source: 'supply demand',
      target: 'elasticity',
      type: 'prerequisite',
      evidence: 'The price elasticity of demand is the percentage change in quantity demanded divided by the percentage change in price.',
      weight: 0.9,
    },
    {
      id: 'edge-2',
      source: 'consumer theory',
      target: 'market structures',
      type: 'prerequisite',
      evidence: 'A monopoly is a single seller facing the whole market demand curve.',
      weight: 0.85,
    },
    {
      id: 'edge-3',
      source: 'market structures',
      target: 'welfare economics',
      type: 'prerequisite',
      evidence: 'Market failures — externalities, public goods, market power — drive a wedge between private and social value.',
      weight: 0.85,
    },
    {
      id: 'edge-4',
      source: 'market structures',
      target: 'game theory basics',
      type: 'prerequisite',
      evidence: 'Oligopoly is a market with a few interdependent firms.',
      weight: 0.8,
    },
    {
      id: 'edge-5',
      source: 'elasticity',
      target: 'welfare economics',
      type: 'related',
      evidence: 'Total surplus is maximised at the competitive equilibrium.',
      weight: 0.55,
    },
  ],
};

export function withDemoCourseGraphs<T extends { id: string; conceptGraph?: ConceptGraph }>(courses: T[]): T[] {
  return courses.map((course) => {
    if (course.id === 'c1' && !course.conceptGraph) {
      return { ...course, conceptGraph: DEMO_C1_CONCEPT_GRAPH };
    }
    return course;
  });
}
