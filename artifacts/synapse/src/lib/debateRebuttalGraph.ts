import type { ArgNode } from '../components/workspace/ArgumentMap';

export type RebuttalEdge = {
  fromId: string;
  toId: string;
  kind: 'supports' | 'rebuts';
  label?: string;
};

export type RebuttalGraph = {
  nodes: ArgNode[];
  edges: RebuttalEdge[];
};

function flatten(node: ArgNode, out: ArgNode[] = []): ArgNode[] {
  out.push(node);
  for (const c of node.children ?? []) flatten(c, out);
  return out;
}

/** Build claim ↔ counter interactive graph from debate tree (W8). */
export function buildRebuttalGraph(root: ArgNode): RebuttalGraph {
  const nodes = flatten(root);
  const edges: RebuttalEdge[] = [];

  const walk = (node: ArgNode, parent?: ArgNode) => {
    if (parent) {
      const kind = node.type === 'refutation' ? 'rebuts' as const : 'supports' as const;
      edges.push({
        fromId: node.id,
        toId: parent.id,
        kind,
        label: node.type === 'refutation' ? 'rebuts' : 'supports',
      });
    }
    for (const c of node.children ?? []) walk(c, node);
  };
  walk(root);

  return { nodes, edges };
}

export function rebuttalEdgesForNode(graph: RebuttalGraph, nodeId: string): RebuttalEdge[] {
  return graph.edges.filter((e) => e.fromId === nodeId || e.toId === nodeId);
}
