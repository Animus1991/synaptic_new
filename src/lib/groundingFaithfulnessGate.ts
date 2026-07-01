/**
 * S9 — Unified span-level grounding faithfulness gate for lessons + Agent.
 */

import type { MessageCitation } from '../types';
import { checkAgentGrounding, type AgentGroundingReport } from './agentGroundingCheck';
import { verifyGrounding } from './grounding';
import type { WorkspacePanel, WorkspacePanelBlock } from './workspaceLessonPanels';

export type GroundingFaithfulnessReport = {
  faithfulness: number;
  groundedRatio: number;
  strictPass: boolean;
  verified: boolean;
  ungroundedClaims: string[];
};

export const DEFAULT_MIN_FAITHFULNESS = 0.5;
export const STRICT_MIN_FAITHFULNESS = 0.95;

function blockClaims(block: WorkspacePanelBlock): string[] {
  switch (block.kind) {
    case 'paragraph':
      return [block.text];
    case 'callout':
      return [block.text, block.title];
    case 'formula':
      return [block.formula, block.label];
    case 'cards':
      return block.items.flatMap((item) => [item.title, ...item.bullets]);
    case 'steps':
      return block.items.flatMap((item) => [item.label, item.content]);
    case 'source':
    case 'actions':
      return [];
    default:
      return [];
  }
}

/** Collect verifiable claim strings from lesson panels (excludes source citation blocks). */
export function extractPanelClaims(panels: WorkspacePanel[]): string[] {
  const claims: string[] = [];
  for (const panel of panels) {
    claims.push(panel.title);
    for (const block of panel.blocks) {
      claims.push(...blockClaims(block));
    }
  }
  return claims.map((c) => c.trim()).filter((c) => c.length > 12);
}

export function passesGroundingFaithfulnessGate(
  claims: string[],
  sourceText: string,
  opts: { strict?: boolean; minFaithfulness?: number } = {},
): GroundingFaithfulnessReport {
  const strict = opts.strict ?? false;
  const minFaithfulness = opts.minFaithfulness ?? (strict ? STRICT_MIN_FAITHFULNESS : DEFAULT_MIN_FAITHFULNESS);
  const result = verifyGrounding(claims, sourceText, { strict, minScore: minFaithfulness });

  const ungroundedClaims = result.checks
    .filter((c) => !c.grounded && c.claim.trim().length > 12)
    .map((c) => c.claim.trim());

  const verified = strict
    ? result.strictPass && ungroundedClaims.length === 0
    : result.faithfulness >= minFaithfulness;

  return {
    faithfulness: result.faithfulness,
    groundedRatio: result.groundedRatio,
    strictPass: result.strictPass,
    verified,
    ungroundedClaims,
  };
}

export function verifyLessonPanelsFaithfulness(
  panels: WorkspacePanel[],
  sourceText: string,
  strict = false,
): GroundingFaithfulnessReport {
  return passesGroundingFaithfulnessGate(extractPanelClaims(panels), sourceText, { strict });
}

export function verifyAgentFaithfulness(
  content: string,
  citations: MessageCitation[],
  strict = true,
): AgentGroundingReport {
  return checkAgentGrounding(content, citations, { strict });
}

export function applyAgentGroundingGate(
  content: string,
  citations: MessageCitation[],
  opts: { strict?: boolean; lang?: 'en' | 'el' } = {},
): { content: string; report: AgentGroundingReport; gatePassed: boolean } {
  const strict = opts.strict ?? true;
  const report = checkAgentGrounding(content, citations, { strict });
  const gatePassed = report.verified;
  if (strict && !gatePassed) {
    const prefix =
      opts.lang === 'el'
        ? '⚠️ Μερικές δηλώσεις δεν επαληθεύτηκαν πλήρως από την πηγή σου.\n\n'
        : '⚠️ Some statements could not be fully verified from your source.\n\n';
    return { content: prefix + content, report, gatePassed: false };
  }
  return { content, report, gatePassed };
}
