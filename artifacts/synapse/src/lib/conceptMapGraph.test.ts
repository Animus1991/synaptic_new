import { describe, expect, it } from 'vitest';
import { edgeKey, mergeConceptMapGraph, newCustomNodeId } from './conceptMapGraph';

describe('conceptMapGraph', () => {
  it('mergeConceptMapGraph prefers saved overlay when nodes exist', () => {
    const baseNodes = [{ id: 'a', label: 'A', type: 'concept' as const, x: 0, y: 0, mastery: 0 }];
    const baseEdges = [{ from: 'a', to: 'b', relation: 'related' as const }];
    const saved = {
      nodes: [{ id: 'user-1', label: 'Custom', type: 'concept' as const, x: 10, y: 10, mastery: 0 }],
      edges: [],
    };
    expect(mergeConceptMapGraph(baseNodes, baseEdges, saved)).toEqual(saved);
  });

  it('edgeKey is stable', () => {
    expect(edgeKey({ from: 'a', to: 'b', relation: 'prerequisite' })).toBe('a|b|prerequisite');
  });

  it('newCustomNodeId is unique-ish', () => {
    expect(newCustomNodeId()).toMatch(/^user-/);
  });
});
