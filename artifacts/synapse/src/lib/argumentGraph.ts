/**
 * Claim / evidence / counter-argument mining.
 *
 * Builds an argument graph from source text: claims, supporting evidence,
 * refutations, and evidence links grounded in specific sentences. The graph can
 * feed the workspace argument-map tool and the debate generator.
 */

import { splitSentences } from './contentAnalysis';

export type ArgumentNodeType = 'claim' | 'evidence' | 'counter' | 'premise';

export interface ArgumentNode {
  id: string;
  type: ArgumentNodeType;
  text: string;
  /** Confidence score 0-1. */
  confidence: number;
  /** Character offset of the grounding sentence in the source text. */
  charStart?: number;
  charEnd?: number;
}

export type ArgumentEdgeType = 'supports' | 'refutes' | 'depends';

export interface ArgumentEdge {
  id: string;
  source: string;
  target: string;
  type: ArgumentEdgeType;
  /** Confidence that this edge is valid. */
  weight: number;
  /** Evidence snippet. */
  evidence?: string;
}

export interface ArgumentGraph {
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
  /** Central claim of the graph, if one was detected. */
  centralClaim?: ArgumentNode;
}

const CLAIM_MARKERS =
  /\b(therefore|thus|hence|consequently|in conclusion|we argue|we claim|it follows that|the (?:key|main|central) (?:point|claim|thesis|argument)|overall|argue|claim|conclude|άρα|συνεπώς|καταλήγουμε|υποστηρίζουμε|η κεντρική (?:θέση|ιδέα)|συμπεραίνουμε)\b/i;
const EVIDENCE_MARKERS =
  /\b(because|since|as shown by|evidence|the data|studies show|research|for example|for instance|experiment|survey|διότι|επειδή|όπως δείχνει|τα δεδομένα|μελέτες|παράδειγμα|πειράματα|έρευνα)\b/i;
const COUNTER_MARKERS =
  /\b(however|but|although|yet|on the contrary|in contrast|nevertheless|nonetheless|critics|objection|fails to|does not|cannot|παρόλο|ωστόσο|αλλά|εν τούτοις|αντιθέτως|αντίθετα|κριτικοί|αποτυγχάνει|δεν)\b/i;

interface ScoredSentence {
  text: string;
  charStart: number;
  charEnd: number;
  claim: number;
  evidence: number;
  counter: number;
}

function scoreSentence(text: string): Omit<ScoredSentence, 'text' | 'charStart' | 'charEnd'> {
  return {
    claim: CLAIM_MARKERS.test(text) ? 1 : 0,
    evidence: EVIDENCE_MARKERS.test(text) ? 1 : 0,
    counter: COUNTER_MARKERS.test(text) ? 1 : 0,
  };
}

function id(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function conceptOverlap(a: string, b: string): number {
  const wordsA = new Set<string>((a.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) as string[]);
  const wordsB = (b.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) as string[];
  if (wordsA.size === 0 || wordsB.length === 0) return 0;
  let shared = 0;
  for (const w of wordsA) if (wordsB.includes(w)) shared++;
  return shared / Math.max(wordsA.size, wordsB.length);
}

/**
 * Build an argument graph from source text.
 *
 * Picks a central claim, then links supporting and refuting sentences to it
 * based on shared content words and marker signals.
 */
export function buildArgumentGraph(text: string, maxNodes = 12): ArgumentGraph {
  const normalized = text.replace(/\r\n/g, '\n');
  const sentences = splitSentences(normalized);
  if (sentences.length === 0) return { nodes: [], edges: [] };

  const scored: ScoredSentence[] = [];
  let offset = 0;
  for (const s of sentences) {
    const start = normalized.indexOf(s, offset);
    const end = start + s.length;
    offset = end;
    scored.push({
      text: s,
      charStart: start >= 0 ? start : 0,
      charEnd: end,
      ...scoreSentence(s),
    });
  }

  // Central claim: highest claim score; fall back to the first sentence.
  const sortedClaims = [...scored].sort((a, b) => b.claim - a.claim || b.text.length - a.text.length);
  const central = sortedClaims[0]!;
  const nodes: ArgumentNode[] = [
    {
      id: id('claim', 0),
      type: 'claim',
      text: central.text.slice(0, 200),
      confidence: 0.6 + central.claim * 0.3,
      charStart: central.charStart,
      charEnd: central.charEnd,
    },
  ];

  const edges: ArgumentEdge[] = [];
  let nodeIndex = 1;
  let edgeIndex = 0;

  const centralId = nodes[0]!.id;

  for (const s of scored) {
    if (s.text === central.text) continue;

    const overlap = conceptOverlap(s.text, central.text);
    if (overlap < 0.05 && s.evidence === 0 && s.counter === 0) continue;
    if (overlap < 0.05) continue;

    const type: ArgumentNodeType = s.counter > s.evidence ? 'counter' : 'evidence';
    const edgeType: ArgumentEdgeType = type === 'counter' ? 'refutes' : 'supports';
    const node: ArgumentNode = {
      id: id(type, nodeIndex++),
      type,
      text: s.text.slice(0, 200),
      confidence: 0.5 + (s.evidence + s.counter) * 0.25 + overlap * 0.25,
      charStart: s.charStart,
      charEnd: s.charEnd,
    };
    nodes.push(node);
    edges.push({
      id: id('edge', edgeIndex++),
      source: node.id,
      target: centralId,
      type: edgeType,
      weight: Math.min(1, 0.5 + overlap * 0.5),
      evidence: s.text.slice(0, 120),
    });
  }

  // If we have too few nodes, add the next-most-relevant sentences as premises.
  if (nodes.length < 4) {
    const relevant = scored
      .filter((s) => s.text !== central.text && !nodes.some((n) => n.text === s.text))
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, maxNodes - nodes.length);
    for (const s of relevant) {
      const type: ArgumentNodeType = s.counter > s.evidence ? 'counter' : 'premise';
      const node: ArgumentNode = {
        id: id(type, nodeIndex++),
        type,
        text: s.text.slice(0, 200),
        confidence: 0.5,
        charStart: s.charStart,
        charEnd: s.charEnd,
      };
      nodes.push(node);
      if (type === 'counter') {
        edges.push({
          id: id('edge', edgeIndex++),
          source: node.id,
          target: centralId,
          type: 'refutes',
          weight: 0.5,
          evidence: s.text.slice(0, 120),
        });
      }
    }
  }

  return { nodes, edges, centralClaim: nodes[0] };
}

/**
 * Get the nodes that directly support or refute a given claim node.
 */
export function getEvidenceForClaim(graph: ArgumentGraph, claimId: string): { supporting: ArgumentNode[]; refuting: ArgumentNode[] } {
  const supporting: ArgumentNode[] = [];
  const refuting: ArgumentNode[] = [];
  for (const edge of graph.edges) {
    if (edge.target !== claimId) continue;
    const node = graph.nodes.find((n) => n.id === edge.source);
    if (!node) continue;
    if (edge.type === 'supports') supporting.push(node);
    if (edge.type === 'refutes') refuting.push(node);
  }
  return { supporting, refuting };
}

/**
 * Export the argument graph to a simple nested debate-tree shape.
 */
export function argumentGraphToDebateTree(graph: ArgumentGraph): {
  claim: string;
  supports: string[];
  refutations: string[];
} {
  const claim = graph.centralClaim?.text ?? graph.nodes[0]?.text ?? '';
  const { supporting, refuting } = getEvidenceForClaim(graph, graph.centralClaim?.id ?? graph.nodes[0]?.id ?? '');
  return {
    claim,
    supports: supporting.map((n) => n.text),
    refutations: refuting.map((n) => n.text),
  };
}
