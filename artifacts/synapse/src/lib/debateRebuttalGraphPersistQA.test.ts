import { describe, expect, it } from 'vitest';
import type { ArgNode } from '../components/workspace/ArgumentMap';
import { debateSeedFingerprint } from './debateTreePersist';
import {
  auditDebateRebuttalPersistence,
  countUserAuthoredNodes,
  debatePersistEdgeLabel,
  formatDebatePersistBanner,
  resolveDebateTreeForQA,
  verifyRebuttalGraphSync,
} from './debateRebuttalGraphPersistQA';
import { mergeDebateTrees } from './debateTreePersist';

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

describe('debateRebuttalGraphPersistQA', () => {
  it('verifies graph edges match tree structure', () => {
    const tree: ArgNode = {
      ...seed,
      children: [
        ...(seed.children ?? []),
        { id: 'n-1', type: 'refutation', text: 'Tariffs protect jobs', x: 0, y: 0 },
      ],
    };
    const sync = verifyRebuttalGraphSync(tree);
    expect(sync.ok).toBe(true);
    expect(sync.issues).toHaveLength(0);
  });

  it('audits user rebuttals and graph sync on active tree', () => {
    const active: ArgNode = {
      ...seed,
      children: [
        ...(seed.children ?? []),
        { id: 'n-42', type: 'refutation', text: 'Protectionism helps workers', x: 0, y: 0 },
      ],
    };
    const report = auditDebateRebuttalPersistence({
      activeTree: active,
      seed,
      lang: 'en',
      envelope: {
        version: 1,
        tree: active,
        seedFingerprint: debateSeedFingerprint(seed),
        updatedAt: Date.now(),
      },
    });
    expect(report.ok).toBe(true);
    expect(report.userRebuttalCount).toBe(1);
    expect(report.graphSyncOk).toBe(true);
    expect(report.graphEdgeCount).toBe(2);
  });

  it('detects seed refresh while preserving rebuttals in merge audit', () => {
    const saved: ArgNode = {
      ...seed,
      children: [
        ...(seed.children ?? []),
        { id: 'n-1', type: 'refutation', text: 'Tariffs protect jobs', x: 0, y: 0 },
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
    const report = auditDebateRebuttalPersistence({
      activeTree: merged,
      seed: refreshed,
      lang: 'en',
      envelope: {
        version: 1,
        tree: saved,
        seedFingerprint: debateSeedFingerprint(seed),
        updatedAt: Date.now(),
      },
    });
    expect(report.seedChanged).toBe(true);
    expect(report.userRebuttalCount).toBe(1);
    expect(report.ok).toBe(true);
    expect(verifyRebuttalGraphSync(merged).ok).toBe(true);
  });

  it('reattaches orphan user rebuttals to root after seed refresh', () => {
    const saved: ArgNode = {
      ...seed,
      children: [
        {
          id: 'gone',
          type: 'support',
          text: 'Removed in seed',
          x: 0,
          y: 0,
          children: [
            { id: 'n-orphan', type: 'refutation', text: 'Orphan counter', x: 0, y: 0 },
          ],
        },
      ],
    };
    const refreshed: ArgNode = {
      ...seed,
      children: [{ id: 's0', type: 'support', text: 'New support only', x: 0, y: 0 }],
    };
    const merged = mergeDebateTrees(saved, refreshed);
    expect(countUserAuthoredNodes(merged)).toBe(1);
    const report = auditDebateRebuttalPersistence({
      activeTree: merged,
      seed: refreshed,
      lang: 'en',
      envelope: {
        version: 1,
        tree: saved,
        seedFingerprint: debateSeedFingerprint(seed),
        updatedAt: Date.now(),
      },
    });
    expect(report.edgeKind).toBe('orphan-reattach');
    expect(report.userRebuttalCount).toBe(1);
  });

  it('resolveDebateTreeForQA keeps saved tree when fingerprint unchanged', () => {
    const fp = debateSeedFingerprint(seed);
    const saved = { ...seed, text: 'Edited claim' };
    const resolved = resolveDebateTreeForQA(
      { version: 1, tree: saved, seedFingerprint: fp, updatedAt: 0 },
      seed,
    );
    expect(resolved?.text).toBe('Edited claim');
  });

  it('formats persist banner with edge and rebuttal counts', () => {
    const banner = formatDebatePersistBanner({
      userRebuttalCount: 2,
      graphEdgeCount: 4,
      graphSyncOk: true,
      seedChanged: true,
      lang: 'en',
    });
    expect(banner).toContain('4 edges');
    expect(banner).toContain('2 rebuttals');
    expect(banner).toContain('seed refreshed');
  });

  it('labels edge kinds in both locales', () => {
    expect(debatePersistEdgeLabel('graph-sync-ok', 'en')).toBe('Graph synced');
    expect(debatePersistEdgeLabel('orphan-reattach', 'el')).toBe('Ορφανό → root');
  });
});
