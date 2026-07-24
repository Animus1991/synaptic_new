/** Persisted concept-map graph (nodes + edges) per workspace scope. */

export type ConceptMapNodeSave = {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory';
  x: number;
  y: number;
  note?: string;
  pinned?: boolean;
};

export type ConceptMapEdgeSave = {
  from: string;
  to: string;
  relation: 'prerequisite' | 'related' | 'contrasts';
  /** Optional PMI score for co-occurrence edges (TOOL-CM-03). */
  pmi?: number;
};

export type ConceptMapGraphSave = {
  nodes: ConceptMapNodeSave[];
  edges: ConceptMapEdgeSave[];
};

export function edgeKey(edge: ConceptMapEdgeSave): string {
  return `${edge.from}|${edge.to}|${edge.relation}`;
}

export function mergeConceptMapGraph(
  baseNodes: ConceptMapNodeSave[],
  baseEdges: ConceptMapEdgeSave[],
  saved: ConceptMapGraphSave | null,
): ConceptMapGraphSave {
  if (saved && saved.nodes.length > 0) return saved;
  return { nodes: baseNodes, edges: baseEdges };
}

export function newCustomNodeId(): string {
  return `user-${Date.now().toString(36)}`;
}
