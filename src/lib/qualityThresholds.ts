/**
 * Staged quality bar — single source of truth for course gates and grounding faithfulness.
 * Stage 2 of 3 toward pre-launch targets (PASS 75, grounding span 95%, faithfulness 95%).
 */
export const QUALITY_STAGE = 2 as const;

/** Course overall score required to mark ready (target: 75). */
export const COURSE_PASS_THRESHOLD = 75;

/** Min fraction of outline concepts with source spans (target: 0.95). */
export const GROUNDING_SPAN_RATIO_MIN = 0.7;

/** Min fraction of concepts found in raw source text (target: 0.95). */
export const GROUNDING_SOURCE_TEXT_RATIO_MIN = 0.65;

/** Fallback when only source-quality signal exists (target: 70). */
export const GROUNDING_SOURCE_QUALITY_MIN = 58;

/** Non-strict lesson/agent faithfulness floor (stage 3: 0.95). */
export const DEFAULT_MIN_FAITHFULNESS = 0.65;

/** Strict mode faithfulness floor (pre-launch target). */
export const STRICT_MIN_FAITHFULNESS = 0.95;

/** Agent citation token-overlap coverage floor (target: 0.55). */
export const CITATION_OVERLAP_MIN_COVERAGE = 0.5;

/** Eval CI baseline — positive-only grounded cases (stage 3: 0.95). */
export const EVAL_GROUNDING_FAITHFULNESS_MIN = 0.75;
