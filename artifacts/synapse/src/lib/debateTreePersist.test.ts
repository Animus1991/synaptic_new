import { describe, expect, it } from 'vitest';
import type { ArgNode } from '../components/workspace/ArgumentMap';
import {
  countUserRebuttals,
  debateSeedFingerprint,
  mergeDebateTrees,
  resolveDebateTree,
} from './debateTreePersist';

const seed: ArgNode = {
  id: 'root',
  type: 'claim',
  text: 'Trade creates gains',
  x: 0,
  y: 0,
  children: [
    { id: 's0', type: 'support', text: 'Exports rise', x: 0, y: 0 },
  ],
};

describe('debateTreePersist', () => {
  it('fingerprints seed trees for change detection', () => {
    const fp = debateSeedFingerprint(seed);
    expect(fp).toContain('root');
    expect(fp).not.toBe(debateSeedFingerprint({ ...seed, text: 'Other claim' }));
  });

  it('keeps user rebuttals when seed refreshes', () => {
    const saved: ArgNode = {
      ...seed,
      children: [
        ...(seed.children ?? []),
        {
          id: 'n-1',
          type: 'refutation',
          text: 'Protectionism helps domestic workers',
          x: 0,
          y: 0,
        },
      ],
    };

    const refreshed: ArgNode = {
      ...seed,
      children: [
        { id: 's0', type: 'support', text: 'Exports rise with comparative advantage', x: 0, y: 0 },
        { id: 's1', type: 'support', text: 'Consumers benefit', x: 0, y: 0 },
      ],
    };

    const merged = mergeDebateTrees(saved, refreshed);
    expect(findText(merged, 'Protectionism helps domestic workers')).toBe(true);
    expect(findText(merged, 'Consumers benefit')).toBe(true);
    expect(countUserRebuttals(merged)).toBe(1);
  });

  it('returns saved tree when fingerprint unchanged', () => {
    const fp = debateSeedFingerprint(seed);
    const saved = { ...seed, text: 'Edited claim' };
    const resolved = resolveDebateTree(saved, seed, fp, fp);
    expect(resolved?.text).toBe('Edited claim');
  });
});

function findText(node: ArgNode, text: string): boolean {
  if (node.text === text) return true;
  return (node.children ?? []).some((c) => findText(c, text));
}
