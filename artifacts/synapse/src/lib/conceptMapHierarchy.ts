export type HierarchyEdge = {
  from: string;
  to: string;
  relation: 'prerequisite' | 'related' | 'contrasts' | string;
};

export type HierarchyNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  mastery?: number;
  type?: string;
  note?: string;
  pinned?: boolean;
};

export type ConceptLayerGroup = {
  depth: number;
  label: string;
  nodeIds: string[];
};

const LAYER_LABELS_EN = ['Foundation', 'Core', 'Application', 'Extension', 'Advanced'];
const LAYER_LABELS_EL = ['Θεμέλιο', 'Πυρήνας', 'Εφαρμογή', 'Επέκταση', 'Προχωρημένο'];

/**
 * Assign depth via prerequisite edges only (from → to means `from` is lower layer).
 */
export function assignConceptLayers(
  nodes: { id: string }[],
  edges: HierarchyEdge[],
): Map<string, number> {
  const prereqEdges = edges.filter((e) => e.relation === 'prerequisite');
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  for (const n of nodes) {
    incoming.set(n.id, new Set());
    outgoing.set(n.id, new Set());
  }
  for (const e of prereqEdges) {
    if (!incoming.has(e.to) || !outgoing.has(e.from)) continue;
    incoming.get(e.to)!.add(e.from);
    outgoing.get(e.from)!.add(e.to);
  }

  const roots = nodes.filter((n) => incoming.get(n.id)?.size === 0).map((n) => n.id);
  const depth = new Map<string, number>();
  const queue = [...roots];
  for (const id of roots) depth.set(id, 0);

  if (queue.length === 0 && nodes.length > 0) {
    depth.set(nodes[0]!.id, 0);
    queue.push(nodes[0]!.id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const child of outgoing.get(id) ?? []) {
      const next = d + 1;
      if (!depth.has(child) || (depth.get(child) ?? 0) < next) {
        depth.set(child, next);
        queue.push(child);
      }
    }
  }

  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }
  return depth;
}

export function groupNodesByLayer(
  nodes: { id: string }[],
  layers: Map<string, number>,
  lang: 'en' | 'el' = 'en',
): ConceptLayerGroup[] {
  const labels = lang === 'el' ? LAYER_LABELS_EL : LAYER_LABELS_EN;
  const byDepth = new Map<number, string[]>();
  for (const n of nodes) {
    const d = layers.get(n.id) ?? 0;
    const list = byDepth.get(d) ?? [];
    list.push(n.id);
    byDepth.set(d, list);
  }
  return [...byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, nodeIds]) => ({
      depth,
      label: labels[depth] ?? (lang === 'el' ? `Επίπεδο ${depth + 1}` : `Layer ${depth + 1}`),
      nodeIds,
    }));
}

/**
 * Hierarchical layout: layers top-to-bottom, nodes spread horizontally per layer.
 */
export function computeHierarchicalLayout(
  nodes: HierarchyNode[],
  edges: HierarchyEdge[],
  opts?: { width?: number; height?: number; layerGap?: number },
): HierarchyNode[] {
  if (nodes.length === 0) return nodes;
  const width = opts?.width ?? 640;
  const height = opts?.height ?? 400;
  const layerGap = opts?.layerGap ?? 90;
  const layers = assignConceptLayers(nodes, edges);
  const groups = groupNodesByLayer(nodes, layers);
  const topPad = 50;

  return nodes.map((n) => {
    const depth = layers.get(n.id) ?? 0;
    const group = groups.find((g) => g.depth === depth);
    const ids = group?.nodeIds ?? [n.id];
    const idx = ids.indexOf(n.id);
    const count = ids.length;
    const y = topPad + depth * layerGap;
    const span = width - 80;
    const x = count <= 1 ? width / 2 : 40 + (idx / Math.max(count - 1, 1)) * span;
    return {
      ...n,
      x: Math.round(x),
      y: Math.round(Math.min(y, height - 40)),
      pinned: n.pinned,
    };
  });
}

export function layerColor(depth: number): string {
  const palette = ['#67e8f9', '#818cf8', '#34d399', '#fbbf24', '#fb7185'];
  return palette[depth % palette.length]!;
}
