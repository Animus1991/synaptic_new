import { describe, it, expect } from 'vitest';
import { buildArgumentGraph, getEvidenceForClaim, argumentGraphToDebateTree } from './argumentGraph';

describe('argumentGraph', () => {
  const text = `
Regular exercise improves cardiovascular health. However, excessive exercise can lead to injury.
Studies show that 30 minutes of moderate activity reduces blood pressure.
Therefore, moderate exercise is beneficial for most people.
  `.trim();

  it('builds a claim node and evidence links', () => {
    const graph = buildArgumentGraph(text);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.centralClaim).toBeDefined();
    expect(graph.edges.length).toBeGreaterThan(0);
    const supports = graph.edges.filter((e) => e.type === 'supports');
    const refutes = graph.edges.filter((e) => e.type === 'refutes');
    expect(supports.length + refutes.length).toBeGreaterThan(0);
  });

  it('links evidence to the central claim', () => {
    const graph = buildArgumentGraph(text);
    const { supporting, refuting } = getEvidenceForClaim(graph, graph.centralClaim!.id);
    expect(supporting.length + refuting.length).toBeGreaterThan(0);
  });

  it('exports a debate tree', () => {
    const graph = buildArgumentGraph(text);
    const tree = argumentGraphToDebateTree(graph);
    expect(tree.claim.length).toBeGreaterThan(0);
    expect(Array.isArray(tree.supports)).toBe(true);
    expect(Array.isArray(tree.refutations)).toBe(true);
  });
});
