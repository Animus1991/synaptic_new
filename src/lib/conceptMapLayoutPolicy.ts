/**
 * Wave 6.8b — Adaptive force-layout policy for large concept maps.
 */

export const LARGE_GRAPH_NODE_THRESHOLD = 45;
export const FORCE_LAYOUT_MAX_ITERATIONS = 140;
export const FORCE_LAYOUT_MIN_ITERATIONS = 48;

export type ConceptMapLayoutPlan = {
  iterations: number;
  warnLargeGraph: boolean;
  deferMs: number;
  label: 'fast' | 'balanced' | 'heavy';
};

export function resolveConceptMapLayoutPlan(nodeCount: number): ConceptMapLayoutPlan {
  if (nodeCount <= 20) {
    return { iterations: FORCE_LAYOUT_MAX_ITERATIONS, warnLargeGraph: false, deferMs: 0, label: 'fast' };
  }
  if (nodeCount <= LARGE_GRAPH_NODE_THRESHOLD) {
    const t = (nodeCount - 20) / (LARGE_GRAPH_NODE_THRESHOLD - 20);
    const iterations = Math.round(FORCE_LAYOUT_MAX_ITERATIONS - t * 60);
    return { iterations, warnLargeGraph: false, deferMs: 16, label: 'balanced' };
  }
  const overflow = Math.min(nodeCount - LARGE_GRAPH_NODE_THRESHOLD, 80);
  const iterations = Math.max(FORCE_LAYOUT_MIN_ITERATIONS, FORCE_LAYOUT_MIN_ITERATIONS - Math.floor(overflow / 4));
  return { iterations, warnLargeGraph: true, deferMs: 32, label: 'heavy' };
}

export function conceptMapLargeGraphMessage(nodeCount: number, lang: 'en' | 'el'): string | null {
  if (nodeCount <= LARGE_GRAPH_NODE_THRESHOLD) return null;
  return lang === 'el'
    ? `${nodeCount} έννοιες — χρησιμοποίησε φίλτρο ή ιεραρχία για καλύτερη απόδοση`
    : `${nodeCount} concepts — use filter or hierarchy layout for smoother performance`;
}
