import { describe, expect, it } from 'vitest';
import { assignConceptLayers, computeHierarchicalLayout, groupNodesByLayer } from './conceptMapHierarchy';

describe('conceptMapHierarchy', () => {
  const nodes = [
    { id: 'a', label: 'A', x: 0, y: 0, mastery: 0, type: 'concept' as const },
    { id: 'b', label: 'B', x: 0, y: 0, mastery: 0, type: 'concept' as const },
    { id: 'c', label: 'C', x: 0, y: 0, mastery: 0, type: 'concept' as const },
  ];
  const edges = [
    { from: 'a', to: 'b', relation: 'prerequisite' as const },
    { from: 'b', to: 'c', relation: 'prerequisite' as const },
  ];

  it('assigns increasing depth along prerequisite chain', () => {
    const layers = assignConceptLayers(nodes, edges);
    expect(layers.get('a')).toBe(0);
    expect(layers.get('b')).toBe(1);
    expect(layers.get('c')).toBe(2);
  });

  it('groups nodes by layer', () => {
    const layers = assignConceptLayers(nodes, edges);
    const groups = groupNodesByLayer(nodes, layers);
    expect(groups).toHaveLength(3);
  });

  it('lays out nodes vertically by layer', () => {
    const laid = computeHierarchicalLayout(nodes, edges);
    const ys = laid.map((n) => n.y);
    expect(ys[2]).toBeGreaterThan(ys[0]!);
  });
});
