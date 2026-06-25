import { describe, it, expect } from 'vitest';
import { buildConceptGraph, getPrerequisites, topologicalSort } from './conceptGraph';

describe('conceptGraph', () => {
  const text = `
# Calculus

To understand derivatives, you need to understand limits first.
Integration depends on derivatives.

Limits are the foundation of calculus.
A derivative is a special case of a limit.

# Linear Algebra

To understand matrices, one should know vectors.
`.trim();

  it('builds nodes and prerequisite edges from text', async () => {
    const graph = await buildConceptGraph(text, { maxConcepts: 12 });
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.valid).toBe(true);
    expect(graph.order.length).toBe(graph.nodes.length);
    const labels = graph.nodes.map((n) => n.label.toLowerCase());
    expect(labels.some((l) => l.includes('limits'))).toBe(true);
    expect(labels.some((l) => l.includes('derivatives'))).toBe(true);
  });

  it('detects explicit prerequisite relations', async () => {
    const graph = await buildConceptGraph(text, { maxConcepts: 12 });
    const prereq = graph.edges.find(
      (e) => e.type === 'prerequisite' && e.target.toLowerCase().includes('deriv'),
    );
    expect(prereq).toBeDefined();
    expect(prereq!.source.toLowerCase()).toContain('limit');
  });

  it('topological sort is empty when a cycle exists', () => {
    const nodes = [
      { id: 'a', label: 'A', key: 'a', salience: 1, tier: 1 },
      { id: 'b', label: 'B', key: 'b', salience: 1, tier: 1 },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b', type: 'prerequisite' as const, weight: 1 },
      { id: 'e2', source: 'b', target: 'a', type: 'prerequisite' as const, weight: 1 },
    ];
    expect(topologicalSort(nodes, edges)).toEqual([]);
  });

  it('returns prerequisites for a target concept', async () => {
    const graph = await buildConceptGraph(text, { maxConcepts: 12 });
    const derivativeNode = graph.nodes.find((n) => n.key.toLowerCase() === 'derivative');
    expect(derivativeNode).toBeDefined();
    const prereqs = getPrerequisites(graph, derivativeNode!.key);
    expect(prereqs.length).toBeGreaterThan(0);
    expect(prereqs.some((p) => p.toLowerCase().includes('limit'))).toBe(true);
  });

  it('falls back to supplied concepts when extraction is skipped', async () => {
    const graph = await buildConceptGraph(text, { concepts: ['limits', 'derivatives', 'integration'] });
    expect(graph.nodes.length).toBe(3);
    expect(graph.nodes.map((n) => n.label)).toEqual(expect.arrayContaining(['limits', 'derivatives', 'integration']));
  });
});
