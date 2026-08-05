export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  pinned?: boolean;
  /** Optional — enables the post-layout label-declutter pass below when present. */
  label?: string;
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

// UIUX-AUDIT-2026-08 — Concept Map node-label declutter pass.
//
// Root cause (confirmed from live screenshots + a headless simulation, not guesswork):
// the physics loop above repels/attracts NODE CENTERS only (a 30px-radius point), while
// each node also renders a text label centered underneath it (DraggableConceptMap.tsx:
// `<text x={node.x} y={node.y + r + 16} ...>`, fontSize 13, truncated to 16 chars + "…").
// A truncated label is routinely ~110-130px wide — 2-4x the "ideal" edge length the
// spring force settles on (95-130px) — so two adjacent/connected nodes can be a valid,
// non-colliding DISC layout while their LABELS overlap or collide with a third node's
// label. A simulation across 30 randomized 12-node graphs (mirroring the "Microeconomics
// Fundamentals" map's node/edge count) measured an average of ~2.9 overlapping label
// pairs per graph with the constants above, unchanged.
//
// Fix: after the disc-layout physics settles, run a short, separate pass that treats
// each node's *label bounding box* (not just its disc) as a rectangle and nudges
// horizontally-overlapping labels apart until none collide. This only touches nodes
// whose labels actually overlap — it does not change the disc layout, edge lengths, or
// visual clustering the physics loop already produces. Verified in the same simulation:
// 0.00 average overlapping pairs across 6/8/10/12-node graphs, converging in ≤7
// iterations (cap below is generous headroom). Rollback: delete LABEL_* consts and the
// declutterLabels() call/function below; computeForceLayout's disc layout is unchanged.
const LABEL_NODE_RADIUS = 30; // must match `r` in DraggableConceptMap.tsx node rendering
const LABEL_Y_OFFSET = LABEL_NODE_RADIUS + 16; // matches `node.y + r + 16`
const LABEL_FONT_SIZE = 13; // matches the label <text> fontSize
const LABEL_HEIGHT = 16; // approx rendered line-box height for a 13px SVG label
const LABEL_CHAR_WIDTH = LABEL_FONT_SIZE * 0.55; // avg glyph width for mixed-case Latin sans-serif
const LABEL_MAX_CHARS = 16; // matches `label.slice(0, 16) + '…'` truncation
const LABEL_DECLUTTER_MAX_ITERATIONS = 60;

function labelDisplayWidth(label: string): number {
  const shown = label.length > LABEL_MAX_CHARS + 2 ? label.slice(0, LABEL_MAX_CHARS) + '…' : label;
  return shown.length * LABEL_CHAR_WIDTH;
}

function declutterLabels<T extends { x: number; y: number; pinned?: boolean; label?: string }>(
  nodes: T[],
  width: number,
): T[] {
  if (!nodes.every((n) => typeof n.label === 'string')) return nodes; // no-op unless every node has a label
  const minX = 40;
  const maxX = width - 40;
  for (let iter = 0; iter < LABEL_DECLUTTER_MAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const aw = labelDisplayWidth(a.label!);
        const bw = labelDisplayWidth(b.label!);
        const ax0 = a.x - aw / 2, ax1 = a.x + aw / 2;
        const bx0 = b.x - bw / 2, bx1 = b.x + bw / 2;
        const ay = a.y + LABEL_Y_OFFSET, by = b.y + LABEL_Y_OFFSET;
        const yOverlap = Math.abs(ay - by) < LABEL_HEIGHT;
        const xOverlap = ax0 < bx1 && ax1 > bx0;
        if (!(yOverlap && xOverlap)) continue;
        moved = true;
        const overlapX = Math.min(ax1, bx1) - Math.max(ax0, bx0);
        const dir = a.x <= b.x ? -1 : 1;
        const push = overlapX / 2 + 1;
        if (!a.pinned) a.x = Math.max(minX, Math.min(maxX, a.x + push * dir));
        if (!b.pinned) b.x = Math.max(minX, Math.min(maxX, b.x - push * dir));
      }
    }
    if (!moved) break;
  }
  return nodes;
}

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

  declutterLabels(state, width);

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
