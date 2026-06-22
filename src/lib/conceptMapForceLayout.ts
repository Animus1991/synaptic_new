export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  pinned?: boolean;
};

export type LayoutEdge = {
  from: string;
  to: string;
  relation?: 'prerequisite' | 'related' | 'contrasts' | string;
};

export type ForceLayoutOptions = {
  width?: number;
  height?: number;
  iterations?: number;
  /** Node id held at canvas center (e.g. workspace focus concept). */
  anchorId?: string;
};

/**
 * Lightweight force-directed layout — prerequisite edges pull longer than related.
 * Keeps concept maps readable without external graph libs; respects pinned nodes.
 */
export function computeForceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  opts: ForceLayoutOptions = {},
): LayoutNode[] {
  if (nodes.length === 0) return [];
  const width = opts.width ?? 640;
  const height = opts.height ?? 400;
  const iterations = opts.iterations ?? 140;
  const cx = width / 2;
  const cy = height / 2;

  const state = nodes.map((n) => ({
    ...n,
    pinned: n.pinned || n.id === opts.anchorId,
    x: n.id === opts.anchorId ? cx : n.x,
    y: n.id === opts.anchorId ? cy : n.y,
  }));
  const byId = Object.fromEntries(state.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const cool = 1 - iter / iterations;

    for (let i = 0; i < state.length; i++) {
      for (let j = i + 1; j < state.length; j++) {
        const a = state[i]!;
        const b = state[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 12);
        const repulse = (6500 / (dist * dist)) * cool;
        dx = (dx / dist) * repulse;
        dy = (dy / dist) * repulse;
        if (!a.pinned) { a.x -= dx; a.y -= dy; }
        if (!b.pinned) { b.x += dx; b.y += dy; }
      }
    }

    for (const edge of edges) {
      const a = byId[edge.from];
      const b = byId[edge.to];
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 8);
      const ideal = edge.relation === 'prerequisite' ? 130
        : edge.relation === 'contrasts' ? 100
          : 95;
      const pull = (dist - ideal) * 0.06 * cool;
      dx = (dx / dist) * pull;
      dy = (dy / dist) * pull;
      if (!a.pinned) { a.x += dx; a.y += dy; }
      if (!b.pinned) { b.x -= dx; b.y -= dy; }
    }

    for (const n of state) {
      if (n.pinned) continue;
      n.x += (cx - n.x) * 0.02 * cool;
      n.y += (cy - n.y) * 0.02 * cool;
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    }
  }

  return state.map((n) => ({
    id: n.id,
    x: Math.round(n.x),
    y: Math.round(n.y),
    pinned: n.pinned,
  }));
}

/** Pick anchor node id closest to focus concept label. */
export function resolveFocusAnchorId(
  nodes: { id: string; label: string }[],
  focusConcept?: string,
): string | undefined {
  if (!focusConcept?.trim() || nodes.length === 0) return undefined;
  const key = focusConcept.trim().toLowerCase();
  const direct = nodes.find((n) => n.label.trim().toLowerCase() === key);
  if (direct) return direct.id;
  let best: { id: string; score: number } | undefined;
  for (const n of nodes) {
    const label = n.label.toLowerCase();
    const score = label.includes(key) || key.includes(label) ? Math.min(label.length, key.length) : 0;
    if (score > 0 && (!best || score > best.score)) best = { id: n.id, score };
  }
  return best?.id;
}
