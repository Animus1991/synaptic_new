import { describe, expect, it, vi } from 'vitest';
import { connectConceptMapCursors, publishLocalCursor } from './conceptMapCursorSync';

describe('conceptMapCursorSync', () => {
  it('publishLocalCursor notifies subscribers', () => {
    const fn = vi.fn();
    const off = connectConceptMapCursors('c1', 'elasticity', 'http://localhost:0', fn);
    publishLocalCursor({
      clientId: 'local',
      nodeId: 'n1',
      x: 10,
      y: 20,
      label: 'Elasticity',
    });
    expect(fn).toHaveBeenCalled();
    off();
  });
});
