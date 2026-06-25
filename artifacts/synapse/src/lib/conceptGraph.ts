/**
 * Typed knowledge graph + prerequisite DAG for Synapse courses.
 *
 * Builds a directed acyclic graph of concepts from a source text. Edges are
 * typed (prerequisite, related, part_of, example_of, contradicts). The DAG
 * drives topic ordering and locking decisions: a topic whose concepts have
 * unsatisfied prerequisites stays locked until the learner covers them.
 */

import { extractConceptsV2, normalizeConcept, rankKeyphrases } from './contentAnalysis';
import type { Keyphrase } from './contentAnalysis';

export type RelationType =
  | 'prerequisite'
  | 'related'
  | 'part_of'
  | 'example_of'
  | 'contradicts'
  | 'unknown';

export interface ConceptNode {
  id: string;
  label: string;
  key: string;
  /** Importance score from the concept extractor (0-1). */
  salience: number;
  /** 1-based learning tier derived from the DAG depth. */
  tier: number;
}

export interface ConceptEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  /** Evidence sentence or phrase from the source. */
  evidence?: string;
  /** Confidence 0-1. */
  weight: number;
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  /** Ordered list of concept keys from the topological sort of prerequisites. */
  order: string[];
  /** True when the prerequisite graph is acyclic. */
  valid: boolean;
}

export interface BuildConceptGraphOptions {
  maxConcepts?: number;
  headingText?: string;
  /** Optional embedding reranker for concept extraction. */
  embedder?: { embed(texts: string[]): Promise<number[][] | null>; ready: boolean };
  /**
   * Minimum evidence weight for an edge to be included. Higher values make the
   * graph sparser and more conservative.
   */
  minEdgeWeight?: number;
  /** If supplied, use these concepts instead of extracting them from text. */
  concepts?: string[];
}

const PREREQ_PATTERNS: { type: RelationType; regex: RegExp }[] = [
  {
    type: 'prerequisite',
    regex: /(?:to\s+(?:understand|learn|study|master)|before\s+(?:studying|learning|understanding))\s+(.+?)[,;\s]+(?:you|one|we)\s+(?:need|should|must|require)\s+(?:to\s+)?(?:know|understand|learn|have an understanding of)\s+(.+?)(?:[.;]|\bon\b|\bin\b|\band\b|\bor\b|\bfirst\b)/i,
  },
  {
    type: 'prerequisite',
    regex: /(.+?)\s+(?:depends on|requires|is built on|is based on|presupposes|assumes)\s+(.+?)(?:[.;]|\bto\b|\bin\b|\band\b|\bor\b)/i,
  },
  {
    type: 'prerequisite',
    regex: /(?:first|start with)\s+(.+?)(?:,\s*then|,?\s*before\s+(?:moving|going)\s+(?:on|to))\s+(.+?)/i,
  },
  {
    type: 'part_of',
    regex: /(.+?)\s+is\s+(?:a\s+)?(?:part of|component of|aspect of|element of)\s+(.+?)/i,
  },
  {
    type: 'example_of',
    regex: /(.+?)\s+is\s+(?:an?\s+)?(?:example of|instance of|special case of)\s+(.+?)/i,
  },
  {
    type: 'contradicts',
    regex: /(.+?)\s+(?:contradicts|is incompatible with|refutes|conflicts with)\s+(.+?)/i,
  },
  {
    type: 'related',
    regex: /(.+?)\s+(?:is related to|is associated with|is linked to|connects to)\s+(.+?)/i,
  },
];

function normalizeConceptKey(label: string): string {
  return normalizeConcept(label);
}

function findConceptNode(nodes: ConceptNode[], key: string): ConceptNode | undefined {
  return nodes.find((n) => n.key === key);
}

function pickConceptKey(label: string, nodes: ConceptNode[]): string | null {
  const direct = normalizeConceptKey(label);
  if (findConceptNode(nodes, direct)) return direct;
  const words = direct.split(/\s+/).filter(Boolean);
  for (let len = words.length; len >= 1; len--) {
    const sub = words.slice(0, len).join(' ');
    if (findConceptNode(nodes, sub)) return sub;
  }
  return null;
}

function stripSentence(sentence: string, maxLen = 240): string {
  return sentence.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function scoreRelation(type: RelationType, source: string, target: string): number {
  let weight = 0.5;
  if (type === 'prerequisite') weight = 0.9;
  if (type === 'part_of') weight = 0.75;
  if (type === 'example_of') weight = 0.7;
  if (type === 'contradicts') weight = 0.85;
  if (type === 'related') weight = 0.45;
  // Boost when both source and target are short and look like noun phrases.
  if (source.split(/\s+/).length <= 4 && target.split(/\s+/).length <= 4) weight += 0.1;
  return Math.min(1, weight);
}

/**
 * Infer typed edges between concepts by scanning the text for explicit relation
 * patterns. Returns only edges whose source and target are in the concept set.
 */
export function inferRelations(
  text: string,
  nodes: ConceptNode[],
  options: { minWeight?: number } = {},
): ConceptEdge[] {
  const minWeight = options.minWeight ?? 0.4;
  const sentences = text.replace(/\r\n/g, '\n').split(/(?<=[.!?;·])\s+/u);
  const edges: ConceptEdge[] = [];
  const seen = new Set<string>();
  let edgeIndex = 0;

  const addEdge = (source: string, target: string, type: RelationType, evidence: string) => {
    const weight = scoreRelation(type, source, target);
    if (weight < minWeight) return;
    const key = `${source}|${type}|${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      id: `edge-${edgeIndex++}`,
      source,
      target,
      type,
      evidence: stripSentence(evidence),
      weight,
    });
  };

  for (const sentence of sentences) {
    for (const { type, regex } of PREREQ_PATTERNS) {
      const m = sentence.match(regex);
      if (!m) continue;
      const dependentKey = pickConceptKey(m[1]!, nodes);
      const prereqKey = pickConceptKey(m[2]!, nodes);
      if (dependentKey && prereqKey && dependentKey !== prereqKey) {
        // For prerequisite-like relations, the source is the prerequisite and
        // the target is the dependent concept. For symmetric relations, keep the
        // natural order found in the text.
        if (type === 'prerequisite' || type === 'part_of' || type === 'example_of') {
          const parent = type === 'prerequisite' ? prereqKey : dependentKey;
          const child = type === 'prerequisite' ? dependentKey : prereqKey;
          addEdge(parent, child, type, sentence);
        } else {
          addEdge(dependentKey, prereqKey, type, sentence);
        }
      }
    }
  }

  // Add co-occurrence "related" edges for concepts that appear close together
  // frequently but are not already linked by a stronger relation.
  const window = 6;
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const keySet = new Set(nodes.map((n) => n.key));
  const coCounts = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const span = tokens.slice(i, i + window);
    const found: string[] = [];
    for (let len = 4; len >= 1; len--) {
      for (let j = 0; j + len <= span.length; j++) {
        const key = normalizeConceptKey(span.slice(j, j + len).join(' '));
        if (keySet.has(key)) found.push(key);
      }
    }
    const unique = [...new Set(found)];
    for (let a = 0; a < unique.length; a++) {
      for (let b = a + 1; b < unique.length; b++) {
        const k = [unique[a]!, unique[b]!].sort().join('|');
        coCounts.set(k, (coCounts.get(k) ?? 0) + 1);
      }
    }
  }
  const threshold = Math.max(2, Math.floor(tokens.length / 400));
  for (const [pair, count] of coCounts.entries()) {
    if (count < threshold) continue;
    const [a, b] = pair.split('|');
    if (!a || !b) continue;
    const key = `${a}|related|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      id: `edge-${edgeIndex++}`,
      source: a,
      target: b,
      type: 'related',
      weight: Math.min(0.6, 0.35 + count * 0.05),
    });
  }

  return edges;
}

/**
 * Compute a topological order of the prerequisite DAG. Returns an empty array if
 * the graph contains a cycle.
 */
export function topologicalSort(nodes: ConceptNode[], edges: ConceptEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeKeys = new Set(nodes.map((n) => n.key));
  for (const n of nodes) {
    inDegree.set(n.key, 0);
    adj.set(n.key, []);
  }

  for (const e of edges) {
    if (e.type !== 'prerequisite') continue;
    if (!nodeKeys.has(e.source) || !nodeKeys.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [k, d] of inDegree.entries()) {
    if (d === 0) queue.push(k);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      const next = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, next);
      if (next === 0) queue.push(v);
    }
  }

  return order.length === nodes.length ? order : [];
}

/**
 * Compute a learning tier for each node based on its prerequisite depth in the
 * DAG. Sources have tier 1; each successor is max(parent tier) + 1.
 */
function computeTiers(nodes: ConceptNode[], edges: ConceptEdge[]): Map<string, number> {
  const tiers = new Map<string, number>();
  const children = new Map<string, string[]>();
  const nodeKeys = new Set(nodes.map((n) => n.key));
  for (const n of nodes) {
    tiers.set(n.key, 1);
    children.set(n.key, []);
  }
  for (const e of edges) {
    if (e.type !== 'prerequisite') continue;
    if (nodeKeys.has(e.source) && nodeKeys.has(e.target)) {
      children.get(e.source)!.push(e.target);
    }
  }

  const queue = nodes.map((n) => n.key);
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of queue) {
      for (const child of children.get(key) ?? []) {
        const next = Math.max(tiers.get(child) ?? 1, (tiers.get(key) ?? 1) + 1);
        if (next > (tiers.get(child) ?? 1)) {
          tiers.set(child, next);
          changed = true;
        }
      }
    }
  }
  return tiers;
}

/**
 * Build a typed concept graph from source text. Extracts the top concepts,
 * infers typed edges, and returns a prerequisite DAG plus a topological order.
 */
export async function buildConceptGraph(
  text: string,
  options: BuildConceptGraphOptions = {},
): Promise<ConceptGraph> {
  const { maxConcepts = 30, headingText = '', embedder, minEdgeWeight = 0.4, concepts } = options;

  let ranked: Keyphrase[];
  if (concepts && concepts.length > 0) {
    ranked = concepts.slice(0, maxConcepts).map((label, i) => ({
      phrase: label,
      score: 1 - i / (concepts.length || 1),
    }));
  } else {
    ranked = await extractConceptsV2(text, { max: maxConcepts, headingText, embedder, requireMultiple: false });
    if (ranked.length === 0) {
      ranked = rankKeyphrases(text, maxConcepts, headingText);
    }
  }

  const nodes: ConceptNode[] = ranked.map((kp, i) => ({
    id: `concept-${i}`,
    label: kp.phrase,
    key: normalizeConceptKey(kp.phrase),
    salience: kp.score,
    tier: 1,
  }));

  const edges = inferRelations(text, nodes, { minWeight: minEdgeWeight });
  const order = topologicalSort(nodes, edges);
  const valid = order.length === nodes.length && nodes.length > 0;
  const tiers = computeTiers(nodes, edges);

  return {
    nodes: nodes.map((n) => ({ ...n, tier: tiers.get(n.key) ?? 1 })),
    edges,
    order,
    valid,
  };
}

/**
 * Returns the prerequisite keys for a target concept. Useful for locking topics
 * until prerequisites are mastered.
 */
export function getPrerequisites(graph: ConceptGraph, key: string): string[] {
  return graph.edges
    .filter((e) => e.type === 'prerequisite' && e.target === key)
    .map((e) => e.source);
}

/**
 * Group concepts by their DAG tier. Each tier can become a topic or a lesson
 * ordering constraint.
 */
export function conceptsByTier(graph: ConceptGraph): Map<number, ConceptNode[]> {
  const groups = new Map<number, ConceptNode[]>();
  for (const node of graph.nodes) {
    if (!groups.has(node.tier)) groups.set(node.tier, []);
    groups.get(node.tier)!.push(node);
  }
  return groups;
}
