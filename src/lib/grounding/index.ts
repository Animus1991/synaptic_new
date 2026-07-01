/**
 * S9-PR5 — Unified grounding module (span verification, citation overlap, faithfulness gate).
 */

export type {
  AgentGroundingReport,
  CitationOverlapReport,
  GroundedClaimDetail,
  GroundingCheck,
  GroundingFaithfulnessReport,
  GroundingResult,
  GroundingSpan,
  MessageCitation,
  SourceHighlight,
  VerifyGroundingOptions,
} from './types';

export { verifyGrounding, verifySentence, verifyAnswer } from './spanVerification';
export { verifyCitationOverlap } from './citationOverlap';
export {
  buildCombinedCitationText,
  mapCombinedOffsetToCitation,
  resolveSourceHighlight,
} from './citationMap';
export { checkAgentGrounding } from './agentGrounding';
export {
  DEFAULT_MIN_FAITHFULNESS,
  STRICT_MIN_FAITHFULNESS,
} from '../qualityThresholds';
export {
  extractPanelClaims,
  passesGroundingFaithfulnessGate,
  verifyLessonPanelsFaithfulness,
  verifyAgentFaithfulness,
  applyAgentGroundingGate,
} from './faithfulnessGate';
