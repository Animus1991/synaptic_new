import { describe, expect, it } from 'vitest';
import { computeForceLayout, resolveFocusAnchorId } from './conceptMapForceLayout';

describe('computeForceLayout', () => {
  it('spreads connected nodes apart from overlap', () => {
    const nodes = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 102, y: 101 },
      { id: 'c', x: 101, y: 99 },
    ];
    const edges = [
      { from: 'a', to: 'b', relation: 'related' as const },
      { from: 'b', to: 'c', relation: 'prerequisite' as const },
    ];
    const laid = computeForceLayout(nodes, edges, { width: 500, height: 400, iterations: 80 });
    const a = laid.find((n) => n.id === 'a')!;
    const b = laid.find((n) => n.id === 'b')!;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist).toBeGreaterThan(40);
  });

  it('anchors focus node at center', () => {
    const nodes = [
      { id: 'focus', x: 10, y: 10 },
      { id: 'other', x: 200, y: 200 },
    ];
    const laid = computeForceLayout(nodes, [], { width: 400, height: 300, anchorId: 'focus' });
    const focus = laid.find((n) => n.id === 'focus')!;
    expect(focus.x).toBe(200);
    expect(focus.y).toBe(150);
    expect(focus.pinned).toBe(true);
  });
});

describe('resolveFocusAnchorId', () => {
  it('matches focus concept label', () => {
    const id = resolveFocusAnchorId(
      [{ id: 'x', label: 'Price Elasticity' }, { id: 'y', label: 'Supply' }],
      'Price Elasticity',
    );
    expect(id).toBe('x');
  });
});
