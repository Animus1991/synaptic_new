import type { MessageCitation } from '../types';
import { verifyAnswer } from './grounding';
import { verifyGrounding as verifyCitationOverlap } from './groundingVerifier';
import { resolveSourceHighlight } from './groundingCitationMap';

export type GroundedClaimDetail = {
  claim: string;
  grounded: boolean;
  score: number;
  source?: { fileId: string; charStart: number; charEnd: number };
};

export type AgentGroundingReport = {
  verified: boolean;
  coverage: number;
  faithfulness: number;
  groundedRatio: number;
  unattributedCount: number;
  ungroundedClaims: string[];
  claimDetails: GroundedClaimDetail[];
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
    claimDetails: [],
  };

  if (!content.trim()) return empty;
  if (citations.length === 0) {
    return { ...empty, verified: !strict };
  }

  const overlap = verifyCitationOverlap(content, citations, { strict });
  const span = verifyAnswer(content, citationsToSourceText(citations));

  const claimDetails: GroundedClaimDetail[] = span.checks
    .filter((c) => c.claim.trim().length > 20)
    .map((check) => ({
      claim: check.claim.trim(),
      grounded: check.grounded,
      score: check.score,
      source: resolveSourceHighlight(citations, check),
    }));

  const ungroundedClaims = claimDetails.filter((c) => !c.grounded).map((c) => c.claim);

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
    claimDetails,
  };
}
