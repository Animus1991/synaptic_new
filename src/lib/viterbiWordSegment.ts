/**
 * Wave 8B-β — Viterbi word segmentation for glued tokens using lexicon log-weights.
 */

import { allLexiconWords, type SpellLang } from './spellLexicon';

function wordWeight(word: string): number {
  return Math.log(word.length + 2);
}

/** Segment a glued blob into dictionary words when possible. */
export function viterbiSegmentBlob(blob: string, lang: SpellLang): string | null {
  const clean = blob.trim();
  if (clean.length < 6) return null;

  const dict = new Set(allLexiconWords(lang === 'mixed' ? 'mixed' : lang));
  const normalized = clean.toLowerCase();

  const memo = new Map<string, { score: number; words: string[] } | null>();

  const best = (rest: string): { score: number; words: string[] } | null => {
    if (!rest) return { score: 0, words: [] };
    if (memo.has(rest)) return memo.get(rest)!;

    let bestPath: { score: number; words: string[] } | null = null;
    for (const word of dict) {
      if (word.length > rest.length) continue;
      if (!rest.startsWith(word)) continue;
      const tail = best(rest.slice(word.length));
      if (!tail) continue;
      const score = wordWeight(word) + tail.score;
      if (!bestPath || score > bestPath.score) {
        bestPath = { score, words: [word, ...tail.words] };
      }
    }

    memo.set(rest, bestPath);
    return bestPath;
  };

  const path = best(normalized);
  if (!path || path.words.length < 2) return null;

  const joined = path.words.join(' ');
  if (clean[0] === clean[0]?.toUpperCase()) {
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }
  return joined;
}

/** Apply Viterbi segmentation to long glued tokens in a line. */
export function viterbiRepairGluedTokens(line: string, lang: SpellLang): string {
  return line.replace(/[\p{L}]{10,}/gu, (match) => {
    const segmented = viterbiSegmentBlob(match, lang);
    return segmented ?? match;
  });
}
