import { splitSentences } from './contentAnalysis';
import { conceptRelevanceScore, relevantExcerpt } from './noteContentExtractors';

// Unicode-aware "word boundary": JS \b is ASCII-only and never fires around
// Greek letters, so we gate each term with letter/number lookarounds under /u.
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const HEDGE_MODALS = new RegExp(
  `${B}(however|although|but|yet|nevertheless|conversely|whereas|while|όμως|ωστόσο|αντίθετα|παρόλο|αν και)${E}`,
  'iu',
);
const NEGATION = new RegExp(
  `${B}(not|no|never|cannot|can't|fail|fails|limit|limits|weak|lack|absent|όχι|δεν|ποτέ|αδυναμία|έλλειψη)${E}`,
  'iu',
);
const EXCEPTION = new RegExp(
  `${B}(except|unless|only if|provided that|εκτός|μόνο αν|παρά μόνο)${E}`,
  'iu',
);
const EVIDENCE = new RegExp(
  `\\d+(?:\\.\\d+)?\\s*%|${B}(study|studies|data|research|evidence|μελέτη|έρευνα|στοιχεία|δεδομένα)${E}`,
  'iu',
);

export type CounterArgKind = 'contrast' | 'limitation' | 'exception' | 'evidence';

export type CounterArgument = {
  /** The counter-argument sentence (trimmed), grounded in the notes. */
  text: string;
  /** Why it counters the claim — drives the badge shown to the learner. */
  kind: CounterArgKind;
  /** Full source sentence for citation / read-in-source. */
  source: string;
  score: number;
};

const KIND_LABELS: Record<CounterArgKind, { en: string; el: string }> = {
  contrast: { en: 'Contrast', el: 'Αντίθεση' },
  limitation: { en: 'Limitation', el: 'Περιορισμός' },
  exception: { en: 'Exception', el: 'Εξαίρεση' },
  evidence: { en: 'Counter-evidence', el: 'Αντι-στοιχείο' },
};

export function counterArgKindLabel(kind: CounterArgKind, lang: 'en' | 'el'): string {
  return KIND_LABELS[kind][lang];
}

function classify(sentence: string): CounterArgKind {
  if (EVIDENCE.test(sentence) && (NEGATION.test(sentence) || HEDGE_MODALS.test(sentence))) return 'evidence';
  if (EXCEPTION.test(sentence)) return 'exception';
  if (NEGATION.test(sentence)) return 'limitation';
  return 'contrast';
}

/**
 * Suggest source-grounded counter-arguments for a debate claim.
 * Each result is a real sentence from the notes, classified by the reason it
 * opposes the claim (contrast / limitation / exception / counter-evidence) and
 * carries its source sentence so the UI can cite it (read-in-source).
 */
export function suggestCounterArguments(
  sourceText: string,
  concept: string,
  claimText: string,
  limit = 3,
): CounterArgument[] {
  const excerpt = relevantExcerpt(sourceText, concept, 12000);
  const claimKey = claimText.slice(0, 80).toLowerCase();
  const sentences = splitSentences(excerpt).filter((s) => {
    if (s.toLowerCase().includes(claimKey.slice(0, 40))) return false;
    if (HEDGE_MODALS.test(s) || NEGATION.test(s) || EXCEPTION.test(s)) return true;
    return conceptRelevanceScore(s, concept) > 0.15;
  });

  const scored = sentences.map((sentence) => {
    let refute = 0;
    if (HEDGE_MODALS.test(sentence)) refute += 0.5;
    if (NEGATION.test(sentence)) refute += 0.35;
    if (EXCEPTION.test(sentence)) refute += 0.3;
    if (EVIDENCE.test(sentence)) refute += 0.2;
    const rel = conceptRelevanceScore(sentence, concept);
    return { sentence: sentence.trim(), score: refute * 2 + rel };
  });

  return scored
    .filter((s) => s.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      text: s.sentence.slice(0, 160),
      kind: classify(s.sentence),
      source: s.sentence,
      score: s.score,
    }));
}
