import type { MessageCitation } from '../../types';

export interface GroundingSpan {
  type: 'number' | 'entity' | 'phrase';
  value: string;
  charStart: number;
  charEnd: number;
  confidence: number;
}

export interface GroundingCheck {
  claim: string;
  spans: GroundingSpan[];
  score: number;
  grounded: boolean;
}

export interface GroundingResult {
  checks: GroundingCheck[];
  faithfulness: number;
  groundedRatio: number;
  strictPass: boolean;
}

export interface VerifyGroundingOptions {
  strict?: boolean;
  minScore?: number;
}

export type CitationOverlapReport = {
  coverage: number;
  unattributedCount: number;
  verified: boolean;
};

export type SourceHighlight = {
  fileId: string;
  charStart: number;
  charEnd: number;
};

export type GroundedClaimDetail = {
  claim: string;
  grounded: boolean;
  score: number;
  source?: SourceHighlight;
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

export type GroundingFaithfulnessReport = {
  faithfulness: number;
  groundedRatio: number;
  strictPass: boolean;
  verified: boolean;
  ungroundedClaims: string[];
};

export type { MessageCitation };
