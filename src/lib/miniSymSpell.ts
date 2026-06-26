/**
 * Wave 8B-β — Minimal SymSpell-style fuzzy correction (edit distance ≤ 2) against offline lexicon.
 */

import { allLexiconWords, detectTokenLang, type SpellLang } from './spellLexicon';

function edits1(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    out.push(word.slice(0, i) + word.slice(i + 1));
    for (let c = 97; c <= 122; c++) {
      out.push(word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1));
    }
    if (i < word.length - 1) {
      out.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
    }
  }
  out.push(word + 'a');
  if (word.length > 1) out.push(word.slice(0, -1));
  return out;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** Suggest closest lexicon word; null when no confident match. */
export function fuzzyCorrectToken(token: string, lang?: SpellLang): string | null {
  const bare = token.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '');
  if (!bare || bare.length < 4) return null;

  const resolved = lang ?? detectTokenLang(bare);
  const isGreek = resolved === 'el' || (resolved === 'mixed' && /\p{Script=Greek}/u.test(bare));
  const lower = isGreek
    ? bare.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    : bare.toLowerCase();
  const dict = new Set(allLexiconWords(resolved === 'mixed' ? 'mixed' : resolved));

  if (dict.has(lower)) return null;

  // Latin edit-1 only; Greek OCR fragments need stricter distance to avoid ραθα→κατα.
  if (!isGreek) {
    for (const candidate of edits1(lower)) {
      if (dict.has(candidate)) return preserveCase(bare, candidate);
    }
  }

  const maxDist = isGreek ? (lower.length <= 6 ? 1 : 2) : 2;
  let best: { word: string; dist: number } | null = null;
  for (const word of dict) {
    if (Math.abs(word.length - lower.length) > maxDist) continue;
    const dist = levenshtein(lower, word);
    if (dist > maxDist) continue;
    if (!best || dist < best.dist) best = { word, dist };
  }

  return best ? preserveCase(bare, best.word) : null;
}

function preserveCase(original: string, corrected: string): string {
  if (original[0] === original[0]?.toUpperCase()) {
    return corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  return corrected;
}
