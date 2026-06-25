import type { RubricDimension } from './feynmanRubric';
import { computeRubric, weakestDimensions } from './feynmanRubric';

export type FeynmanGap = {
  dimension: RubricDimension;
  hint: string;
  searchTerm: string;
  severity: number;
};

/**
 * Auto-detect rubric gaps from draft + reference notes (Feynman ↔ Reader correlation).
 */
export function detectFeynmanGaps(
  draft: string,
  concept: string,
  referenceNotes: string,
  gapTerms: string[],
  glossary?: Array<{ term: string; definition?: string }>,
  extraTerms?: string[],
): FeynmanGap[] {
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 8) return [];

  const rubric = computeRubric(draft, wordCount, {
    concept,
    referenceNotes,
    glossary,
    extraTerms,
  });
  const weak = weakestDimensions(rubric, 72);
  const dims: RubricDimension[] = ['accuracy', 'completeness', 'simplicity', 'structure'];

  return dims
    .map((dimension) => {
      const score = rubric[dimension];
      if (score >= 72) return null;
      const severity = (72 - score) / 72;
      let searchTerm = concept;
      if (dimension === 'accuracy') searchTerm = gapTerms[0] ?? concept;
      else if (dimension === 'simplicity') searchTerm = gapTerms[1] ?? gapTerms[0] ?? concept;
      else if (dimension === 'structure') searchTerm = gapTerms[2] ?? concept;
      const hint = weak.includes(dimension)
        ? `Focus on ${dimension} for «${concept}»`
        : `Improve ${dimension}`;
      return { dimension, hint, searchTerm, severity };
    })
    .filter((g): g is FeynmanGap => g !== null)
    .sort((a, b) => b.severity - a.severity);
}
