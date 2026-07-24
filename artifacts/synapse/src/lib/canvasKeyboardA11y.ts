/** Spatial keyboard navigation helpers for SVG/canvas workspace tools. */

export type CanvasNavPoint = { id: string; x: number; y: number };

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

const DIRECTION_ANGLE: Record<CardinalDirection, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/** Pick the closest node in a directional cone; fall back to list order. */
export function nearestNodeInDirection(
  nodes: CanvasNavPoint[],
  currentId: string | null,
  direction: CardinalDirection,
): string | null {
  if (nodes.length === 0) return null;

  const currentIdx = currentId ? nodes.findIndex((n) => n.id === currentId) : -1;
  const current = currentIdx >= 0 ? nodes[currentIdx]! : nodes[0]!;
  const targetAngle = DIRECTION_ANGLE[direction];
  const maxDeviation = Math.PI / 4;

  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const n of nodes) {
    if (n.id === current.id) continue;
    const dx = n.x - current.x;
    const dy = n.y - current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;

    let angle = Math.atan2(dy, dx);
    let delta = angle - targetAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    if (Math.abs(delta) > maxDeviation) continue;

    if (dist < bestDist) {
      bestDist = dist;
      bestId = n.id;
    }
  }

  if (bestId) return bestId;

  const baseIdx = currentIdx >= 0 ? currentIdx : 0;
  const step = direction === 'left' || direction === 'up' ? -1 : 1;
  const nextIdx = (baseIdx + step + nodes.length) % nodes.length;
  return nodes[nextIdx]!.id;
}

/** Cycle tool index with wrap-around (whiteboard toolbar). */
export function cycleToolIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}
