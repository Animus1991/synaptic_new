import { describe, expect, it } from 'vitest';
import { cycleToolIndex, nearestNodeInDirection } from './canvasKeyboardA11y';

const GRID = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 100, y: 0 },
  { id: 'c', x: 0, y: 100 },
  { id: 'd', x: 100, y: 100 },
];

describe('nearestNodeInDirection', () => {
  it('picks spatial neighbor to the right', () => {
    expect(nearestNodeInDirection(GRID, 'a', 'right')).toBe('b');
    expect(nearestNodeInDirection(GRID, 'c', 'right')).toBe('d');
  });

  it('picks spatial neighbor downward', () => {
    expect(nearestNodeInDirection(GRID, 'a', 'down')).toBe('c');
  });

  it('falls back to list order when cone is empty', () => {
    expect(nearestNodeInDirection(GRID, 'b', 'right')).toBe('c');
  });

  it('starts from first node when nothing selected', () => {
    expect(nearestNodeInDirection(GRID, null, 'right')).toBe('b');
  });
});

describe('cycleToolIndex', () => {
  it('wraps forward and backward', () => {
    expect(cycleToolIndex(0, 1, 5)).toBe(1);
    expect(cycleToolIndex(4, 1, 5)).toBe(0);
    expect(cycleToolIndex(0, -1, 5)).toBe(4);
  });
});
