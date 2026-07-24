/**
 * Shared display-text repair for Study Workspace tools (lesson pane, quiz, Feynman, etc.).
 * Keeps excerpt content aligned with CognitiveReader while avoiding spell-gate re-corruption
 * on already-ingested text (e.g. "states" → "rates", "rises" → "prices").
 */

import { runDocumentTextPipeline } from './documentTextPipeline';
import { applyOcrCorrectionsToText } from './readerOcrCorrectionStore';
import { resolveWorkspaceStepExcerpt } from './stepGroundedExcerpt';

/** Known OCR / spell-gate artifacts seen in economics workspace excerpts. */
const LESSON_ARTIFACT_FIXES: ReadonlyArray<[RegExp, string]> = [
  [/\blaw of demand rates\b/gi, 'law of demand states'],
  [/\bquantity demand\b(?!\s*ed\b)/gi, 'quantity demanded'],
  [/\bprice prices\b/gi, 'price rises'],
  [/\bindifference course\b/gi, 'indifference curve'],
  [/\bbudget slide\b/gi, 'budget line'],
  [/\bdemand course\b/gi, 'demand curve'],
  [/\bmarket demand course\b/gi, 'market demand curve'],
  [/\bwhile course\b/gi, 'while curve'],
  [/\bprice rate\b/gi, 'price ratio'],
];

export function repairKnownLessonArtifacts(text: string): string {
  let out = text;
  for (const [pattern, replacement] of LESSON_ARTIFACT_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Reader-aligned repair without re-running spell-gate on stored extracts. */
export function prepareWorkspaceDisplayText(
  text: string,
  scopeKey: string,
  glossaryTerms: string[] = [],
): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const ocrFixed = applyOcrCorrectionsToText(trimmed, scopeKey);
  const sanitized = runDocumentTextPipeline(ocrFixed, {
    glossaryTerms,
    skipSpellGate: true,
  }).text;
  return repairKnownLessonArtifacts(sanitized);
}

const DUPLICATE_WORD = /\b(\w{3,})\s+\1\b/i;
const KNOWN_CORRUPTION =
  /\b(price prices|demand rates|quantity demand(?!\s*ed\b)|indifference course|budget slide|demand course|market demand course)\b/i;

/** Heuristic gate — catches spell-gate / OCR artifacts that should not reach learners. */
export function excerptLooksCorrupted(text: string): boolean {
  const sample = text.trim();
  if (!sample) return false;
  return DUPLICATE_WORD.test(sample) || KNOWN_CORRUPTION.test(sample);
}

/** Prefer a clean excerpt from repaired full text when the primary excerpt still looks corrupted. */
export function gateWorkspaceStepExcerpt(
  excerpt: string,
  repairedFullText: string,
  stepTitle: string | undefined,
  courseConcept: string,
  maxChars = 12000,
): string {
  const primary = excerpt.trim();
  if (!primary || !excerptLooksCorrupted(primary)) return primary;

  const fallback = resolveWorkspaceStepExcerpt(
    repairedFullText,
    stepTitle,
    courseConcept,
    maxChars,
  ).trim();
  if (fallback && !excerptLooksCorrupted(fallback)) return fallback;

  const slice = repairedFullText.slice(0, maxChars).trim();
  return slice || primary;
}
