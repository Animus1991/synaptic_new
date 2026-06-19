export interface RubricScores {
  accuracy: number;
  completeness: number;
  simplicity: number;
  structure: number;
}

export type RubricDimension = keyof RubricScores;

const KEY_TERMS = [
  'cournot', 'bertrand', 'mc', 'marginal', 'quantity', 'price',
  'duopol', 'nash', 'best response', 'oligopoly', 'equilibrium',
];

export function computeRubric(text: string, wordCount: number): RubricScores {
  const lower = text.toLowerCase();
  const termHits = KEY_TERMS.filter((term) => lower.includes(term)).length;
  const accuracy = Math.min(100, Math.round(35 + termHits * 10));

  const completeness =
    wordCount < 15 ? 35 : wordCount < 25 ? 55 : wordCount < 40 ? 72 : wordCount < 60 ? 85 : 92;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgLen = wordCount / Math.max(sentences.length, 1);
  const simplicity = avgLen > 22 ? 48 : avgLen > 16 ? 68 : avgLen > 11 ? 82 : 90;

  let structure = 45;
  if (lower.includes('because') || lower.includes('when')) structure += 18;
  if (lower.includes('example') || lower.includes('such as')) structure += 18;
  if (/\b(first|then|finally)\b/i.test(text)) structure += 12;

  return {
    accuracy,
    completeness,
    simplicity,
    structure: Math.min(100, structure),
  };
}

export function weakestDimensions(scores: RubricScores, threshold = 65): RubricDimension[] {
  return (Object.keys(scores) as RubricDimension[]).filter((d) => scores[d] < threshold);
}
