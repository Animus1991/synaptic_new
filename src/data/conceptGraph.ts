/** Concept prerequisite graph — mirrors LearnAI concept_edges for Microeconomics */
export const ECON_CONCEPT_EDGES: { prerequisite: string; dependent: string }[] = [
  { prerequisite: 'Supply & Demand', dependent: 'Consumer Theory' },
  { prerequisite: 'Supply & Demand', dependent: 'Elasticity' },
  { prerequisite: 'Supply & Demand', dependent: 'Market Structures' },
  { prerequisite: 'Consumer Theory', dependent: 'Market Structures' },
  { prerequisite: 'Market Structures', dependent: 'Welfare Economics' },
  { prerequisite: 'Market Structures', dependent: 'Game Theory' },
  { prerequisite: 'Elasticity', dependent: 'Welfare Economics' },
];

export const ECON_CONCEPT_IMPORTANCE: Record<string, number> = {
  'Supply & Demand': 1.2,
  'Consumer Theory': 1.0,
  'Elasticity': 0.9,
  'Market Structures': 1.1,
  'Welfare Economics': 1.0,
  'Game Theory': 0.8,
};
