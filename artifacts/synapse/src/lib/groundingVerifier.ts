import type { MessageCitation } from '../types';

export type GroundingReport = {
  /** Fraction of substantive sentences with citation overlap (0–1). */
  coverage: number;
  /** Sentences that look factual but lack citation overlap. */
  unattributedCount: number;
  /** Passes strict grounding bar when citations exist and coverage is adequate. */
  verified: boolean;
};

const SENTENCE_RE = /[^.!?…\n]+[.!?…]?/g;

function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return new Set(tokens);
}

function sentenceOverlap(sentence: string, citation: MessageCitation): number {
  const a = tokenize(sentence);
  const b = tokenize(`${citation.snippet} ${citation.heading ?? ''}`);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const t of a) if (b.has(t)) hits += 1;
  return hits / a.size;
}

function isSubstantive(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 40) return false;
  const words = trimmed.split(/\s+/).length;
  return words >= 6;
}

/**
 * Lightweight post-generation grounding check for strict / notes-only modes.
 * Does not call an LLM — uses token overlap between answer sentences and citations.
 */
export function verifyGrounding(
  content: string,
  citations: MessageCitation[],
  opts: { strict?: boolean; minCoverage?: number } = {},
): GroundingReport {
  const strict = opts.strict ?? true;
  const minCoverage = opts.minCoverage ?? 0.35;

  if (!content.trim()) {
    return { coverage: 0, unattributedCount: 0, verified: !strict };
  }
  if (citations.length === 0) {
    return { coverage: 0, unattributedCount: 0, verified: !strict };
  }

  const sentences = [...content.matchAll(SENTENCE_RE)].map((m) => m[0]!.trim()).filter(isSubstantive);
  if (sentences.length === 0) {
    return { coverage: 1, unattributedCount: 0, verified: true };
  }

  let attributed = 0;
  let unattributed = 0;
  for (const sentence of sentences) {
    const best = Math.max(...citations.map((c) => sentenceOverlap(sentence, c)), 0);
    if (best >= 0.18) attributed += 1;
    else unattributed += 1;
  }

  const coverage = attributed / sentences.length;
  const verified = coverage >= minCoverage || (strict && citations.length > 0 && unattributed <= 1);

  return { coverage, unattributedCount: unattributed, verified };
}
