import { describe, expect, it } from 'vitest';
import {
  mergeConceptGraphFromLibrary,
  conceptsInText,
  oneHopNeighborIds,
  graphRerankHits,
  collectSeedConceptsFromHits,
} from './graphRag';

describe('graphRag', () => {
  const graph = mergeConceptGraphFromLibrary({
    uploadedFiles: [],
    glossaryEntries: [{ id: 'g1', term: 'Elasticity', courseId: 'c1' }],
    generatedCourses: [
      {
        id: 'c1',
        conceptGraph: {
          nodes: [
            { id: 'elasticity', label: 'Elasticity', key: 'elasticity' },
            { id: 'demand', label: 'Demand', key: 'demand' },
            { id: 'supply', label: 'Supply', key: 'supply' },
          ],
          edges: [
            { source: 'demand', target: 'elasticity', type: 'prerequisite', weight: 0.9 },
            { source: 'supply', target: 'elasticity', type: 'related', weight: 0.7 },
          ],
        },
      },
    ],
    updatedAt: new Date().toISOString(),
  });

  it('merges course graph and glossary terms', () => {
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.edges.length).toBe(2);
  });

  it('finds concepts in chunk text', () => {
    const ids = conceptsInText('Price elasticity of demand shifts equilibrium.', graph.nodes);
    expect(ids).toContain('elasticity');
  });

  it('expands 1-hop neighbors', () => {
    const neighbors = oneHopNeighborIds(['elasticity'], graph.edges);
    expect(neighbors).toContain('demand');
    expect(neighbors).toContain('supply');
  });

  it('boosts hits mentioning neighbor concepts', () => {
    const hits = [
      {
        id: 'a#0',
        text: 'Macroeconomic indicators include GDP growth rates.',
        score: 0.65,
        fileId: 'a',
        fileName: 'macro.pdf',
        charStart: 0,
        charEnd: 40,
      },
      {
        id: 'b#0',
        text: 'Elasticity measures responsiveness of demand.',
        score: 0.5,
        fileId: 'b',
        fileName: 'micro.pdf',
        charStart: 0,
        charEnd: 45,
      },
    ];
    const { expandedLabels } = collectSeedConceptsFromHits([hits[1]!], graph);
    expect(expandedLabels.length).toBeGreaterThan(0);
    const reranked = graphRerankHits('elasticity demand', hits, graph, expandedLabels, 2);
    const hitB = reranked.find((h) => h.id === 'b#0')!;
    expect((hitB.matchedConcepts?.length ?? 0)).toBeGreaterThan(0);
    expect(hitB.matchedConcepts).toContain('Elasticity');
  });
});
