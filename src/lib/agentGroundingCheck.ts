import type { MessageCitation } from '../types';
import { verifyAnswer } from './grounding';
import { verifyGrounding as verifyCitationOverlap } from './groundingVerifier';

export type AgentGroundingReport = {
  verified: boolean;
  coverage: number;
  faithfulness: number;
  groundedRatio: number;
  unattributedCount: number;
  ungroundedClaims: string[];
};

function citationsToSourceText(citations: MessageCitation[]): string {
  return citations
    .map((c) => [c.heading, c.snippet].filter(Boolean).join(' '))
    .join('\n\n');
}

/**
 * Combined Agent grounding: citation token overlap + span-level faithfulness.
 */
export function checkAgentGrounding(
  content: string,
  citations: MessageCitation[],
  opts: { strict?: boolean } = {},
): AgentGroundingReport {
  const strict = opts.strict ?? true;
  const empty: AgentGroundingReport = {
    verified: !strict,
    coverage: 0,
    faithfulness: 0,
    groundedRatio: 0,
    unattributedCount: 0,
    ungroundedClaims: [],
  };

  if (!content.trim()) return empty;
  if (citations.length === 0) {
    return { ...empty, verified: !strict };
  }

  const overlap = verifyCitationOverlap(content, citations, { strict });
  const span = verifyAnswer(content, citationsToSourceText(citations));

  const ungroundedClaims = span.checks
    .filter((c) => !c.grounded && c.claim.trim().length > 20)
    .map((c) => c.claim.trim());

  const verified = strict
    ? overlap.verified && span.strictPass && ungroundedClaims.length === 0
    : overlap.verified || span.faithfulness >= 0.5;

  return {
    verified,
    coverage: overlap.coverage,
    faithfulness: span.faithfulness,
    groundedRatio: span.groundedRatio,
    unattributedCount: overlap.unattributedCount,
    ungroundedClaims,
  };
}
