import { describe, expect, it } from 'vitest';
import { buildConceptLensView, filterConceptNodes } from './conceptGraphModel';
import { recordConceptActivity } from './workspaceConceptBus';
import type { ConceptMapEdge, ConceptMapNode } from './noteContentExtractors';

const nodes: ConceptMapNode[] = [
  { id: 'supply', label: 'Supply', type: 'concept', x: 100, y: 100, mastery: 30 },
  { id: 'demand', label: 'Demand', type: 'concept', x: 200, y: 100, mastery: 45, note: 'Market demand curve' },
  { id: 'elasticity', label: 'Price Elasticity', type: 'concept', x: 150, y: 200, mastery: 20 },
];

const edges: ConceptMapEdge[] = [
  { from: 'supply', to: 'elasticity', relation: 'prerequisite' },
  { from: 'demand', to: 'elasticity', relation: 'prerequisite' },
  { from: 'supply', to: 'demand', relation: 'related' },
];

describe('conceptGraphModel', () => {
  it('builds lens view with prerequisites, related, and follow-up from graph edges', () => {
    const lens = buildConceptLensView({
      concept: 'Price Elasticity',
      hasSource: true,
      nodes,
      edges,
      glossary: [{
        term: 'Price Elasticity',
        definition: 'Responsiveness of quantity to price.',
        source: 'notes',
        relatedConcepts: [],
        courseId: 'c1',
      }],
      topics: [
        {
          id: 't1',
          title: 'Elasticity',
          description: '',
          lessons: [],
          mastery: 0,
          prerequisites: ['Supply'],
          order: 1,
          isLocked: false,
          estimatedMinutes: 10,
          conceptCount: 1,
          retentionPrediction: 0,
          keyConcepts: ['Price Elasticity'],
        },
      ],
      steps: [{ title: 'Elasticity basics', type: 'Theory' }, { title: 'Quiz', type: 'Quiz' }],
      conceptBars: [{ concept: 'Price Elasticity', mastery: 22 }],
      busState: {},
      weakSpots: [],
      sourceText: 'Supply and demand determine price elasticity.',
    });

    expect(lens.activeConcept).toBe('Price Elasticity');
    expect(lens.definition).toContain('Responsiveness');
    expect(lens.prerequisites.map((r) => r.label).sort()).toEqual(['Demand', 'Supply']);
    expect(lens.mastery).toBe(22);
    expect(lens.hasGraph).toBe(true);
    expect(lens.suggestedActions).toContain('quiz');
  });

  it('maps toolHitCounts from bus state for active concept', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Price Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Price Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Price Elasticity', 'reader', 'focus');

    const lens = buildConceptLensView({
      concept: 'Price Elasticity',
      hasSource: true,
      nodes,
      edges,
      glossary: [],
      topics: [],
      steps: [],
      conceptBars: [],
      busState: bus,
      weakSpots: [],
    });

    expect(lens.toolHits.find((h) => h.tool === 'quiz')?.count).toBe(2);
    expect(lens.toolHits.find((h) => h.tool === 'reader')).toBeUndefined();
    expect(lens.struggling).toBe(true);
  });

  it('returns reader step index for concept-to-section mapping', () => {
    const lens = buildConceptLensView({
      concept: 'Elasticity',
      hasSource: true,
      nodes,
      edges,
      glossary: [],
      topics: [],
      steps: [
        { title: 'Introduction', type: 'Theory' },
        { title: 'Elasticity in markets', type: 'Theory' },
      ],
      conceptBars: [],
      busState: {},
      weakSpots: [],
      sourceText: 'Elasticity in markets explains responsiveness.',
    });

    expect(lens.readerStepIndex).toBe(1);
    expect(lens.sourceSections.some((s) => s.toLowerCase().includes('elasticity'))).toBe(true);
  });

  it('surfaces weak concepts excluding the active term', () => {
    const lens = buildConceptLensView({
      concept: 'Supply',
      hasSource: true,
      nodes,
      edges,
      glossary: [],
      topics: [],
      steps: [],
      conceptBars: [],
      busState: {},
      weakSpots: [
        { concept: 'Supply', mastery: 10, course: 'Econ', source: 'model' },
        { concept: 'Tariffs', mastery: 15, course: 'Econ', source: 'bus' },
      ],
    });

    expect(lens.weakConcepts).toHaveLength(1);
    expect(lens.weakConcepts[0]!.label).toBe('Tariffs');
  });

  it('reports missing-concept and no-source empty reasons', () => {
    const missing = buildConceptLensView({
      concept: '',
      hasSource: true,
      nodes,
      edges,
      glossary: [],
      topics: [],
      steps: [],
      conceptBars: [],
      busState: {},
      weakSpots: [],
    });
    expect(missing.emptyReason).toBe('missing-concept');

    const noSource = buildConceptLensView({
      concept: 'Supply',
      hasSource: false,
      nodes: [],
      edges: [],
      glossary: [],
      topics: [],
      steps: [],
      conceptBars: [],
      busState: {},
      weakSpots: [],
    });
    expect(noSource.emptyReason).toBe('no-source');
  });

  it('filters concept map nodes by search query', () => {
    const filtered = filterConceptNodes(nodes, 'elastic');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.label).toBe('Price Elasticity');
  });
});
