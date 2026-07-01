/**
 * Staged quality bar — single source of truth for course gates and grounding faithfulness.
 * Stage 1 of 3 toward pre-launch targets (PASS 75, grounding span 95%, faithfulness 95%).
 */
export const QUALITY_STAGE = 1 as const;

/** Course overall score required to mark ready (target: 75). */
export const COURSE_PASS_THRESHOLD = 68;

/** Min fraction of outline concepts with source spans (target: 0.95). */
export const GROUNDING_SPAN_RATIO_MIN = 0.55;

/** Min fraction of concepts found in raw source text (target: 0.95). */
export const GROUNDING_SOURCE_TEXT_RATIO_MIN = 0.55;

/** Fallback when only source-quality signal exists (target: 70). */
export const GROUNDING_SOURCE_QUALITY_MIN = 52;

/** Non-strict lesson/agent faithfulness floor (stage 2: 0.75 → stage 3: 0.95). */
export const DEFAULT_MIN_FAITHFULNESS = 0.55;

/** Strict mode faithfulness floor (pre-launch target). */
export const STRICT_MIN_FAITHFULNESS = 0.95;

/** Agent citation token-overlap coverage floor (target: 0.55). */
export const CITATION_OVERLAP_MIN_COVERAGE = 0.45;

/** Eval CI baseline — tuned to current gold fixture envelope (avg ~0.59). */
export const EVAL_GROUNDING_FAITHFULNESS_MIN = 0.58;
