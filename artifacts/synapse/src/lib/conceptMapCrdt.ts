import * as Y from 'yjs';
import type { ConceptMapEdgeSave, ConceptMapGraphSave, ConceptMapNodeSave } from './conceptMapGraph';

export const CONCEPT_MAP_NODES_FIELD = 'nodes';
export const CONCEPT_MAP_EDGES_FIELD = 'edges';
export const CONCEPT_MAP_LOCAL_ORIGIN = 'concept-map-local';

export function readConceptMapGraph(doc: Y.Doc): ConceptMapGraphSave {
  const yNodes = doc.getMap<string>(CONCEPT_MAP_NODES_FIELD);
  const yEdges = doc.getMap<string>(CONCEPT_MAP_EDGES_FIELD);
  const nodes: ConceptMapNodeSave[] = [];
  const edges: ConceptMapEdgeSave[] = [];
  yNodes.forEach((raw) => {
    try {
      nodes.push(JSON.parse(raw) as ConceptMapNodeSave);
    } catch { /* skip corrupt */ }
  });
  yEdges.forEach((raw) => {
    try {
      edges.push(JSON.parse(raw) as ConceptMapEdgeSave);
    } catch { /* skip corrupt */ }
  });
  return { nodes, edges };
}

export function isConceptMapGraphEmpty(doc: Y.Doc): boolean {
  const yNodes = doc.getMap(CONCEPT_MAP_NODES_FIELD);
  const yEdges = doc.getMap(CONCEPT_MAP_EDGES_FIELD);
  return yNodes.size === 0 && yEdges.size === 0;
}

/** Merge local graph into the shared Yjs document (CRDT map per node/edge). */
export function writeConceptMapGraph(
  doc: Y.Doc,
  graph: ConceptMapGraphSave,
  origin: string | symbol = CONCEPT_MAP_LOCAL_ORIGIN,
): void {
  doc.transact(() => {
    const yNodes = doc.getMap<string>(CONCEPT_MAP_NODES_FIELD);
    const yEdges = doc.getMap<string>(CONCEPT_MAP_EDGES_FIELD);
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    for (const id of [...yNodes.keys()]) {
      if (!nodeIds.has(id)) yNodes.delete(id);
    }
    for (const node of graph.nodes) {
      yNodes.set(node.id, JSON.stringify(node));
    }
    const edgeKeys = new Set(graph.edges.map((e) => `${e.from}|${e.to}|${e.relation}`));
    for (const key of [...yEdges.keys()]) {
      if (!edgeKeys.has(key)) yEdges.delete(key);
    }
    for (const edge of graph.edges) {
      yEdges.set(`${edge.from}|${edge.to}|${edge.relation}`, JSON.stringify(edge));
    }
  }, origin);
}

export function observeConceptMapGraph(
  doc: Y.Doc,
  onChange: (graph: ConceptMapGraphSave) => void,
): () => void {
  const yNodes = doc.getMap(CONCEPT_MAP_NODES_FIELD);
  const yEdges = doc.getMap(CONCEPT_MAP_EDGES_FIELD);
  const notify = (_event: Y.YMapEvent<unknown>, transaction: Y.Transaction) => {
    if (transaction.origin === CONCEPT_MAP_LOCAL_ORIGIN) return;
    onChange(readConceptMapGraph(doc));
  };
  yNodes.observe(notify);
  yEdges.observe(notify);
  return () => {
    yNodes.unobserve(notify);
    yEdges.unobserve(notify);
  };
}
