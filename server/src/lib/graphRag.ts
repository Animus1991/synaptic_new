import type { VectorSearchHit } from '../store/vectorChunkStore';
import type { StoredLibrary } from '../store/libraryStore';

export type GraphNode = {
  id: string;
  label: string;
  key: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  type?: string;
  weight?: number;
};

export type ConceptGraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphRagHit = VectorSearchHit & {
  graphBoost?: number;
  matchedConcepts?: string[];
};

type CourseRow = {
  id?: string;
  conceptGraph?: {
    nodes?: { id?: string; label?: string; key?: string }[];
    edges?: { source?: string; target?: string; type?: string; weight?: number }[];
  };
};

type GlossaryRow = { term?: string; id?: string; courseId?: string };

function slugKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Build a merged concept graph from synced library courses + glossary. */
export function mergeConceptGraphFromLibrary(
  library: StoredLibrary,
  courseId?: string,
): ConceptGraphSnapshot {
  const nodeById = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const courses = (library.generatedCourses ?? []) as CourseRow[];
  for (const course of courses) {
    if (courseId && course.id !== courseId) continue;
    const graph = course.conceptGraph;
    if (!graph) continue;
    for (const node of graph.nodes ?? []) {
      const label = String(node.label ?? node.key ?? node.id ?? '').trim();
      if (!label) continue;
      const id = String(node.id ?? slugKey(label));
      nodeById.set(id, { id, label, key: String(node.key ?? slugKey(label)) });
    }
    for (const edge of graph.edges ?? []) {
      const source = String(edge.source ?? '');
      const target = String(edge.target ?? '');
      if (!source || !target) continue;
      const key = `${source}->${target}`;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      edges.push({ source, target, type: edge.type, weight: edge.weight });
    }
  }

  for (const entry of (library.glossaryEntries ?? []) as GlossaryRow[]) {
    const term = String(entry.term ?? '').trim();
    if (!term) continue;
    if (courseId && entry.courseId && entry.courseId !== courseId) continue;
    const id = String(entry.id ?? slugKey(term));
    if (!nodeById.has(id)) {
      nodeById.set(id, { id, label: term, key: slugKey(term) });
    }
  }

  return { nodes: [...nodeById.values()], edges };
}

/** Match concept node ids whose label appears in text (case-insensitive). */
export function conceptsInText(text: string, nodes: GraphNode[]): string[] {
  const hay = text.toLowerCase();
  const matched: string[] = [];
  for (const node of nodes) {
    const label = node.label.toLowerCase();
    if (label.length < 3) continue;
    if (hay.includes(label)) matched.push(node.id);
  }
  return matched;
}

/** Undirected 1-hop neighbor node ids. */
export function oneHopNeighborIds(seedIds: string[], edges: GraphEdge[]): string[] {
  const seeds = new Set(seedIds);
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (seeds.has(edge.source)) neighbors.add(edge.target);
    if (seeds.has(edge.target)) neighbors.add(edge.source);
  }
  for (const id of seedIds) neighbors.delete(id);
  return [...neighbors];
}

function neighborLabels(neighborIds: string[], nodes: GraphNode[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return neighborIds.map((id) => byId.get(id)?.label).filter((l): l is string => !!l?.trim());
}

function lexicalOverlap(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return 0;
  const hay = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (hay.includes(term)) hits += 1;
  }
  return hits / terms.length;
}

/**
 * Graph-augmented rerank: boost hits that mention 1-hop neighbor concepts.
 * `expandedLabels` are neighbor concept labels used for the second retrieval pass.
 */
export function graphRerankHits(
  _query: string,
  hits: VectorSearchHit[],
  graph: ConceptGraphSnapshot,
  expandedLabels: string[],
  topK: number,
): GraphRagHit[] {
  if (hits.length === 0) return [];

  const expandedHay = expandedLabels.join(' ').toLowerCase();
  const scored: GraphRagHit[] = hits.map((hit) => {
    const seedIds = conceptsInText(hit.text, graph.nodes);
    const neighborIds = oneHopNeighborIds(seedIds, graph.edges);
    const neighborTerms = neighborLabels(neighborIds, graph.nodes);
    const textLower = hit.text.toLowerCase();

    let graphBoost = 0;
    for (const term of neighborTerms) {
      if (term.length >= 3 && textLower.includes(term.toLowerCase())) graphBoost += 0.12;
    }
    if (expandedHay) {
      graphBoost += lexicalOverlap(expandedHay, hit.text) * 0.2;
    }
    graphBoost = Math.min(0.45, graphBoost);

    const matchedConcepts = [
      ...seedIds.map((id) => graph.nodes.find((n) => n.id === id)?.label ?? id),
      ...neighborTerms,
    ].filter(Boolean);

    return {
      ...hit,
      graphBoost,
      matchedConcepts: [...new Set(matchedConcepts)],
      score: hit.score * 0.7 + graphBoost * 0.3,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function buildGraphExpandedQuery(query: string, expandedLabels: string[]): string {
  if (expandedLabels.length === 0) return query;
  const extra = expandedLabels.slice(0, 8).join(' ');
  return `${query} ${extra}`.trim();
}

export function collectSeedConceptsFromHits(
  hits: VectorSearchHit[],
  graph: ConceptGraphSnapshot,
): { seedIds: string[]; expandedLabels: string[] } {
  const seedSet = new Set<string>();
  for (const hit of hits) {
    for (const id of conceptsInText(hit.text, graph.nodes)) seedSet.add(id);
  }
  const seedIds = [...seedSet];
  const neighborIds = oneHopNeighborIds(seedIds, graph.edges);
  const expandedLabels = neighborLabels(neighborIds, graph.nodes);
  return { seedIds, expandedLabels };
}
