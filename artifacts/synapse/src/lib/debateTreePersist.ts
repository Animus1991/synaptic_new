/**
 * Wave 6.2 — Merge user-authored rebuttal/support nodes with refreshed seed trees.
 */

import { loadJson, saveJson } from './persistence';
import type { ArgNode } from '../components/workspace/ArgumentMap';

export type DebateTreeEnvelope = {
  version: 1;
  tree: ArgNode;
  seedFingerprint: string | null;
  updatedAt: number;
};

export function isUserAuthoredDebateNode(node: ArgNode): boolean {
  return node.id.startsWith('n-');
}

export function debateSeedFingerprint(seed: ArgNode | null | undefined): string | null {
  if (!seed) return null;
  const texts: string[] = [];
  const walk = (n: ArgNode) => {
    texts.push(`${n.id}:${n.type}:${n.text.trim()}`);
    for (const c of n.children ?? []) walk(c);
  };
  walk(seed);
  return texts.join('|');
}

function cloneNode(node: ArgNode): ArgNode {
  return {
    ...node,
    children: node.children?.map(cloneNode),
  };
}

function findNode(node: ArgNode, id: string): ArgNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

function addChildToTree(node: ArgNode, parentId: string, child: ArgNode): ArgNode {
  if (node.id === parentId) {
    const existing = node.children?.some((c) => c.id === child.id);
    if (existing) return node;
    return { ...node, expanded: true, children: [...(node.children ?? []), cloneNode(child)] };
  }
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => addChildToTree(c, parentId, child)) };
}

function mergeTextFromSaved(seedNode: ArgNode, savedRoot: ArgNode | null): ArgNode {
  const savedNode = savedRoot ? findNode(savedRoot, seedNode.id) : null;
  return {
    ...seedNode,
    text: savedNode?.text?.trim() ? savedNode.text : seedNode.text,
    expanded: savedNode?.expanded ?? seedNode.expanded,
    children: seedNode.children?.map((child) => mergeTextFromSaved(child, savedRoot)),
  };
}

type UserAttachment = { node: ArgNode; parentId: string };

function collectUserAttachments(node: ArgNode, out: UserAttachment[] = []): UserAttachment[] {
  for (const child of node.children ?? []) {
    if (isUserAuthoredDebateNode(child)) {
      out.push({ node: child, parentId: node.id });
    } else {
      collectUserAttachments(child, out);
    }
  }
  return out;
}

/** Preserve user rebuttals when seed tree refreshes after reprocess. */
export function mergeDebateTrees(saved: ArgNode, seed: ArgNode): ArgNode {
  let merged = mergeTextFromSaved(seed, saved);
  const attachments = collectUserAttachments(saved);

  for (const { node, parentId } of attachments) {
    if (findNode(merged, node.id)) continue;
    const parent = findNode(merged, parentId);
    if (parent) {
      merged = addChildToTree(merged, parentId, node);
    } else {
      merged = addChildToTree(merged, merged.id, node);
    }
  }

  return merged;
}

export function resolveDebateTree(
  saved: ArgNode | null,
  seed: ArgNode | null,
  savedFingerprint: string | null,
  seedFingerprint: string | null,
): ArgNode | null {
  if (!saved && !seed) return null;
  if (!saved) return seed ? cloneNode(seed) : null;
  if (!seed) return saved;
  if (savedFingerprint && seedFingerprint && savedFingerprint === seedFingerprint) {
    return saved;
  }
  return mergeDebateTrees(saved, seed);
}

export function loadDebateTreeEnvelope(storageKey: string): DebateTreeEnvelope | null {
  const raw = loadJson<DebateTreeEnvelope | ArgNode | null>(storageKey, null);
  if (!raw) return null;
  if (typeof raw === 'object' && 'version' in raw && raw.version === 1 && 'tree' in raw) {
    return raw as DebateTreeEnvelope;
  }
  return {
    version: 1,
    tree: raw as ArgNode,
    seedFingerprint: null,
    updatedAt: Date.now(),
  };
}

export function saveDebateTreeEnvelope(
  storageKey: string,
  tree: ArgNode,
  seedFingerprint: string | null,
): void {
  const envelope: DebateTreeEnvelope = {
    version: 1,
    tree,
    seedFingerprint,
    updatedAt: Date.now(),
  };
  saveJson(storageKey, envelope);
}

export function countUserRebuttals(tree: ArgNode | null): number {
  if (!tree) return 0;
  let count = 0;
  const walk = (n: ArgNode) => {
    if (isUserAuthoredDebateNode(n) && n.type === 'refutation') count += 1;
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  return count;
}
