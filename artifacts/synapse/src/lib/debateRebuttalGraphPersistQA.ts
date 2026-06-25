/**
 * Wave 6.8h — QA spine for Debate rebuttal graph ↔ tree persistence.
 */

import type { Lang } from './i18n';
import type { ArgNode } from '../components/workspace/ArgumentMap';
import {
  countUserRebuttals,
  debateSeedFingerprint,
  isUserAuthoredDebateNode,
  mergeDebateTrees,
  resolveDebateTree,
  type DebateTreeEnvelope,
} from './debateTreePersist';
import { buildRebuttalGraph, type RebuttalGraph } from './debateRebuttalGraph';

export type DebatePersistEdgeKind =
  | 'seed-stable'
  | 'seed-refreshed'
  | 'orphan-reattach'
  | 'no-rebuttals'
  | 'graph-sync-ok'
  | 'graph-sync-gap'
  | 'legacy-envelope'
  | 'empty-tree';

export type DebatePersistIssue = {
  code: 'graph-node-missing' | 'graph-edge-count' | 'rebuttal-lost' | 'envelope-stale';
  message: string;
};

export type DebateRebuttalPersistReport = {
  ok: boolean;
  edgeKind: DebatePersistEdgeKind;
  userRebuttalCount: number;
  userAuthoredCount: number;
  graphEdgeCount: number;
  graphNodeCount: number;
  graphSyncOk: boolean;
  seedChanged: boolean;
  issues: DebatePersistIssue[];
  bannerSummary: string | null;
};

function flattenTree(node: ArgNode, out: ArgNode[] = []): ArgNode[] {
  out.push(node);
  for (const c of node.children ?? []) flattenTree(c, out);
  return out;
}

function expectedEdgeCount(tree: ArgNode): number {
  let count = 0;
  const walk = (node: ArgNode) => {
    for (const c of node.children ?? []) {
      count += 1;
      walk(c);
    }
  };
  walk(tree);
  return count;
}

export function verifyRebuttalGraphSync(tree: ArgNode): { ok: boolean; issues: DebatePersistIssue[] } {
  const graph = buildRebuttalGraph(tree);
  const issues: DebatePersistIssue[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) {
      issues.push({
        code: 'graph-node-missing',
        message: `Edge ${edge.fromId}→${edge.toId} references missing node`,
      });
    }
  }

  const expected = expectedEdgeCount(tree);
  if (graph.edges.length !== expected) {
    issues.push({
      code: 'graph-edge-count',
      message: `Graph has ${graph.edges.length} edges; tree implies ${expected}`,
    });
  }

  return { ok: issues.length === 0, issues };
}

export function countUserAuthoredNodes(tree: ArgNode | null): number {
  if (!tree) return 0;
  let count = 0;
  const walk = (n: ArgNode) => {
    if (isUserAuthoredDebateNode(n)) count += 1;
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  return count;
}

export function detectOrphanReattach(saved: ArgNode, seed: ArgNode): boolean {
  const seedIds = new Set(flattenTree(seed).map((n) => n.id));

  const walkSaved = (node: ArgNode): boolean => {
    for (const child of node.children ?? []) {
      if (isUserAuthoredDebateNode(child) && !seedIds.has(node.id)) {
        return true;
      }
      if (walkSaved(child)) return true;
    }
    return false;
  };

  return walkSaved(saved);
}

export function auditDebateRebuttalPersistence(input: {
  activeTree: ArgNode | null;
  seed: ArgNode | null;
  lang: Lang;
  envelope?: DebateTreeEnvelope | null;
}): DebateRebuttalPersistReport {
  const issues: DebatePersistIssue[] = [];
  const seedFp = debateSeedFingerprint(input.seed);
  const savedFp = input.envelope?.seedFingerprint ?? debateSeedFingerprint(input.envelope?.tree ?? null);
  const seedChanged = Boolean(seedFp && savedFp && seedFp !== savedFp);

  if (!input.activeTree) {
    return {
      ok: true,
      edgeKind: 'empty-tree',
      userRebuttalCount: 0,
      userAuthoredCount: 0,
      graphEdgeCount: 0,
      graphNodeCount: 0,
      graphSyncOk: true,
      seedChanged: false,
      issues: [],
      bannerSummary: null,
    };
  }

  const graph: RebuttalGraph = buildRebuttalGraph(input.activeTree);
  const graphSync = verifyRebuttalGraphSync(input.activeTree);
  issues.push(...graphSync.issues);

  const userRebuttalCount = countUserRebuttals(input.activeTree);
  const userAuthoredCount = countUserAuthoredNodes(input.activeTree);

  if (input.envelope && !('version' in input.envelope)) {
    issues.push({
      code: 'envelope-stale',
      message: 'Legacy envelope without version field',
    });
  }

  if (input.envelope?.tree && input.seed && seedChanged) {
    const before = countUserRebuttals(input.envelope.tree);
    const merged = mergeDebateTrees(input.envelope.tree, input.seed);
    const after = countUserRebuttals(merged);
    if (before > 0 && after < before) {
      issues.push({
        code: 'rebuttal-lost',
        message: `Merge lost rebuttals (${before} → ${after})`,
      });
    }
    if (detectOrphanReattach(input.envelope.tree, input.seed)) {
      // informational, not an error
    }
  }

  let edgeKind: DebatePersistEdgeKind = 'graph-sync-ok';
  if (!graphSync.ok) edgeKind = 'graph-sync-gap';
  else if (seedChanged) edgeKind = detectOrphanReattach(input.envelope?.tree ?? input.activeTree, input.seed!)
    ? 'orphan-reattach'
    : 'seed-refreshed';
  else if (savedFp && seedFp && savedFp === seedFp) edgeKind = 'seed-stable';
  else if (userRebuttalCount === 0) edgeKind = 'no-rebuttals';
  if (input.envelope && input.envelope.seedFingerprint === null) edgeKind = 'legacy-envelope';

  const bannerSummary = formatDebatePersistBanner({
    userRebuttalCount,
    graphEdgeCount: graph.edges.length,
    graphSyncOk: graphSync.ok,
    seedChanged,
    lang: input.lang,
  });

  return {
    ok: issues.length === 0 && graphSync.ok,
    edgeKind,
    userRebuttalCount,
    userAuthoredCount,
    graphEdgeCount: graph.edges.length,
    graphNodeCount: graph.nodes.length,
    graphSyncOk: graphSync.ok,
    seedChanged,
    issues,
    bannerSummary,
  };
}

export function formatDebatePersistBanner(input: {
  userRebuttalCount: number;
  graphEdgeCount: number;
  graphSyncOk: boolean;
  seedChanged: boolean;
  lang: Lang;
}): string | null {
  const isEl = input.lang === 'el';
  const parts: string[] = [];
  if (input.graphEdgeCount > 0) {
    parts.push(isEl ? `${input.graphEdgeCount} συνδέσεις` : `${input.graphEdgeCount} edges`);
  }
  if (input.userRebuttalCount > 0) {
    parts.push(isEl ? `${input.userRebuttalCount} rebuttals` : `${input.userRebuttalCount} rebuttals`);
  }
  if (input.seedChanged) {
    parts.push(isEl ? 'seed ενημερώθηκε' : 'seed refreshed');
  }
  if (input.graphSyncOk && input.graphEdgeCount > 0) {
    parts.push(isEl ? 'graph OK' : 'graph OK');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function debatePersistEdgeLabel(kind: DebatePersistEdgeKind, lang: Lang): string {
  const en: Record<DebatePersistEdgeKind, string> = {
    'seed-stable': 'Seed stable',
    'seed-refreshed': 'Seed refreshed',
    'orphan-reattach': 'Orphan reattached',
    'no-rebuttals': 'No rebuttals yet',
    'graph-sync-ok': 'Graph synced',
    'graph-sync-gap': 'Graph gap',
    'legacy-envelope': 'Legacy envelope',
    'empty-tree': 'Empty',
  };
  const el: Record<DebatePersistEdgeKind, string> = {
    'seed-stable': 'Σταθερό seed',
    'seed-refreshed': 'Νέο seed',
    'orphan-reattach': 'Ορφανό → root',
    'no-rebuttals': 'Χωρίς rebuttals',
    'graph-sync-ok': 'Graph OK',
    'graph-sync-gap': 'Graph gap',
    'legacy-envelope': 'Legacy envelope',
    'empty-tree': 'Κενό',
  };
  return (lang === 'el' ? el : en)[kind];
}

/** Resolve tree the same way ArgumentMap does — for QA tests. */
export function resolveDebateTreeForQA(
  envelope: DebateTreeEnvelope | null,
  seed: ArgNode | null,
): ArgNode | null {
  const seedFp = debateSeedFingerprint(seed);
  return resolveDebateTree(
    envelope?.tree ?? null,
    seed,
    envelope?.seedFingerprint ?? null,
    seedFp,
  );
}
