import { describe, expect, it } from 'vitest';
import { buildRebuttalGraph, rebuttalEdgesForNode } from './debateRebuttalGraph';
import type { ArgNode } from '../components/workspace/ArgumentMap';

describe('debateRebuttalGraph', () => {
  const root: ArgNode = {
    id: 'c1',
    type: 'claim',
    text: 'Elasticity measures responsiveness',
    x: 0,
    y: 0,
    children: [
      {
        id: 's1',
        type: 'support',
        text: 'Defined in textbooks',
        x: 0,
        y: 0,
      },
      {
        id: 'r1',
        type: 'refutation',
        text: 'Inelastic goods break the rule',
        x: 0,
        y: 0,
      },
    ],
  };

  it('builds supports and rebuts edges from tree', () => {
    const graph = buildRebuttalGraph(root);
    expect(graph.nodes.length).toBe(3);
    expect(graph.edges.some((e) => e.kind === 'rebuts')).toBe(true);
    expect(graph.edges.some((e) => e.kind === 'supports')).toBe(true);
  });

  it('filters edges touching a node', () => {
    const graph = buildRebuttalGraph(root);
    const edges = rebuttalEdgesForNode(graph, 'r1');
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.fromId === 'r1' || e.toId === 'r1')).toBe(true);
  });
});
