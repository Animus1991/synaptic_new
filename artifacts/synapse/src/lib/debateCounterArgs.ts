import { splitSentences } from './contentAnalysis';
import { conceptRelevanceScore, relevantExcerpt } from './noteContentExtractors';

const HEDGE_MODALS = /\b(however|although|but|yet|nevertheless|conversely|whereas|while|όμως|ωστόσο|αντίθετα)\b/i;

/**
 * Suggest counter-argument sentences from grounded notes for a debate claim.
 * Reuses debate sentence scoring heuristics from noteContentExtractors.
 */
export function suggestCounterArguments(
  sourceText: string,
  concept: string,
  claimText: string,
  limit = 3,
): string[] {
  const excerpt = relevantExcerpt(sourceText, concept, 12000);
  const claimKey = claimText.slice(0, 80).toLowerCase();
  const sentences = splitSentences(excerpt).filter((s) => {
    if (s.toLowerCase().includes(claimKey.slice(0, 40))) return false;
    if (HEDGE_MODALS.test(s)) return true;
    return conceptRelevanceScore(s, concept) > 0.15;
  });

  const scored = sentences.map((sentence) => {
    let refute = 0;
    if (HEDGE_MODALS.test(sentence)) refute += 0.5;
    if (/\b(not|no|never|cannot|fail|limit|weak|όχι|δεν|ποτέ)\b/i.test(sentence)) refute += 0.35;
    const rel = conceptRelevanceScore(sentence, concept);
    return { sentence, score: refute * 2 + rel };
  });

  return scored
    .filter((s) => s.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.sentence.slice(0, 160));
}
