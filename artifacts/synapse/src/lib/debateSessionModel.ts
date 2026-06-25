/**
 * Debate session view-model — seed tree, source excerpt, and UI metadata
 * for the workspace Debate tool.
 */

import {
  buildDebateTreeFromNotes,
  relevantExcerpt,
  type DebateNode,
} from './noteContentExtractors';
import { isGenericStudyConcept } from './workspaceContentFallback';

export type { DebateNode };

export type DebateSessionContent = {
  seedTree: DebateNode | null;
  sourceExcerpt: string;
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
  nodeCount: number;
};

export function countDebateNodes(node: DebateNode | null): number {
  if (!node) return 0;
  return 1 + (node.children?.reduce((sum, child) => sum + countDebateNodes(child), 0) ?? 0);
}

export function collectDebateTexts(node: DebateNode): string[] {
  const out = [node.text];
  for (const child of node.children ?? []) {
    out.push(...collectDebateTexts(child));
  }
  return out;
}

export function filterDebateTexts(texts: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return texts;
  return texts.filter((text) => text.toLowerCase().includes(q));
}

export function buildDebateSessionContent(opts: {
  concept: string;
  text: string;
  sectionLabel?: string;
  hasSource: boolean;
}): DebateSessionContent {
  const { concept, text, sectionLabel, hasSource } = opts;

  if (!hasSource) {
    return {
      seedTree: null,
      sourceExcerpt: '',
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
      nodeCount: 0,
    };
  }

  const seedTree = buildDebateTreeFromNotes(text, concept);
  const sourceExcerpt = relevantExcerpt(text, concept, 2500);
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && seedTree !== null;
  const weakExtraction = generic || seedTree === null;

  return {
    seedTree,
    sourceExcerpt,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
    nodeCount: countDebateNodes(seedTree),
  };
}
