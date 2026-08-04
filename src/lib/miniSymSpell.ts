/**
 * Wave 8B-β — Minimal SymSpell-style fuzzy correction (edit distance ≤ 2) against offline lexicon.
 */

import { allLexiconWords, detectTokenLang, spellLexiconVersion, type SpellLang } from './spellLexicon';

/**
 * PERF (workspace freeze root cause — profiler: 12.5s in levenshtein/fuzzyCorrectToken
 * on a 60KB source): the original implementation rebuilt a full-lexicon Set PER
 * TOKEN and linearly levenshtein-scanned the whole dictionary for every unknown
 * token, with no memoization across repeated tokens. All three fixed below;
 * correction results are identical.
 */
const dictCache = new Map<string, { version: number; set: Set<string>; byLen: Map<number, string[]> }>();
const tokenCache = new Map<string, string | null>();
const TOKEN_CACHE_MAX = 50_000;
let tokenCacheVersion = -1;

function lexiconFor(lang: SpellLang): { set: Set<string>; byLen: Map<number, string[]> } {
  const version = spellLexiconVersion();
  const cached = dictCache.get(lang);
  if (cached && cached.version === version) return cached;
  const words = allLexiconWords(lang);
  const set = new Set(words);
  const byLen = new Map<number, string[]>();
  for (const w of words) {
    const bucket = byLen.get(w.length);
    if (bucket) bucket.push(w);
    else byLen.set(w.length, [w]);
  }
  const entry = { version, set, byLen };
  dictCache.set(lang, entry);
  return entry;
}

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

  const version = spellLexiconVersion();
  if (tokenCacheVersion !== version) {
    tokenCache.clear();
    tokenCacheVersion = version;
  }
  const cacheKey = `${resolved}|${lower}`;
  const hit = tokenCache.get(cacheKey);
  if (hit !== undefined) return hit === null ? null : preserveCase(bare, hit);

  const corrected = fuzzyCorrectLower(lower, resolved, isGreek);
  if (tokenCache.size >= TOKEN_CACHE_MAX) tokenCache.clear();
  tokenCache.set(cacheKey, corrected);
  return corrected === null ? null : preserveCase(bare, corrected);
}

function fuzzyCorrectLower(lower: string, resolved: SpellLang, isGreek: boolean): string | null {
  const { set: dict, byLen } = lexiconFor(resolved === 'mixed' ? 'mixed' : resolved);

  if (dict.has(lower)) return null;

  // Latin edit-1 only; Greek OCR fragments need stricter distance to avoid ραθα→κατα.
  if (!isGreek) {
    for (const candidate of edits1(lower)) {
      if (dict.has(candidate)) return candidate;
    }
  }

  // Latin is capped at edit-1 (matches the enumerated pass above): edit-2 on Latin
  // silently rewrites legitimate out-of-vocabulary words (e.g. region→reason,
  // force→forms, firm→for), corrupting clean course text. Greek keeps edit-2 for
  // long tokens where OCR fragmentation is common.
  const maxDist = isGreek ? (lower.length <= 6 ? 1 : 2) : 1;
  let best: { word: string; dist: number } | null = null;
  for (let len = lower.length - maxDist; len <= lower.length + maxDist; len++) {
    const bucket = byLen.get(len);
    if (!bucket) continue;
    for (const word of bucket) {
      const dist = levenshtein(lower, word);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) best = { word, dist };
    }
  }

  return best ? best.word : null;
}

function preserveCase(original: string, corrected: string): string {
  if (original[0] === original[0]?.toUpperCase()) {
    return corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  return corrected;
}
