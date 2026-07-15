/**
 * Note-grounded extractors for Study Workspace tools.
 * Every function operates only on user-uploaded material — no demo templates.
 */

import { t, type Lang } from './i18n';
import type { QuizDef } from './domainContent';
import type { GlossaryEntry, Topic, UploadedFile } from '../types';
import {
  detectSections,
  extractDefinitions,
  extractiveSummary,
  normalizeConcept,
  rankKeyphrases,
  splitSentences,
  titleCasePhrase,
} from './contentAnalysis';
import { inferSectionTitleFromBody, isGenericSectionHeading } from './textSegmentation';
import {
  buildReaderSegments,
  isStudyToolExcludedText,
  readerSegmentsToStepSections,
} from './readerDocumentLayout';
import { isGarbageStepTitle, sanitizeStepTitle } from './workspaceStepTitleQuality';
import { isLectureHeadingText } from './sectionMerger';
import { buildCorpusFromChunks, chunkText, retrieve, tokenize, type SourceChunk } from './rag';
import { extractTables, tableToComparisonRows } from './tableExtract';
import { targetQuizDifficulty } from './quizIrt';
import { resolveContentCitation } from './contentCitation';
import type { ContentCitation } from './contentCitation';
import {
  buildFallbackComparisons,
  buildFallbackDebateTree,
  buildFallbackQuizFromPassage,
  isGenericStudyConcept,
} from './workspaceContentFallback';
import {
  gatherAnalyzedTextCacheKey,
  getCachedGatheredText,
  setCachedGatheredText,
} from './gatherAnalyzedTextCache';

/* ------------------------------------------------------------------ *
 * Source gathering & relevance
 * ------------------------------------------------------------------ */

export function gatherAnalyzedText(files: UploadedFile[], courseId?: string): {
  text: string;
  fileNames: string[];
  hasSource: boolean;
} {
  const cacheKey = gatherAnalyzedTextCacheKey(files, courseId);
  const cached = getCachedGatheredText(cacheKey);
  if (cached) return cached;

  const relevant = files.filter((f) => {
    if (f.status !== 'analyzed' && f.status !== 'processing') return false;
    const body = f.extractedText?.trim();
    if (!body || body.length < 40) return false;
    if (courseId && f.courseId && f.courseId !== courseId) return false;
    return true;
  });
  const text = relevant.map((f) => f.extractedText!.trim()).join('\n\n');
  const result = {
    text,
    fileNames: relevant.map((f) => f.name),
    hasSource: text.length >= 80,
  };
  setCachedGatheredText(cacheKey, result);
  return result;
}

function conceptWords(concept: string): string[] {
  return tokenize(concept).filter((w) => w.length >= 2);
}

/**
 * Score how relevant a text chunk is to the session concept (0–1).
 *
 * Hybrid: a substring match is a strong signal (people overwhelmingly write
 * the concept verbatim in headings/definitions), but for the rest we now use
 * a BM25-style overlap so we don't over-reward stuffing or under-reward
 * paraphrases that share token weight with the concept.
 */
export function conceptRelevanceScore(text: string, concept: string): number {
  const lower = text.toLowerCase();
  const words = conceptWords(concept);
  if (words.length === 0) return 0;
  const phrase = concept.toLowerCase();
  const phraseHit = phrase.length > 4 && lower.includes(phrase) ? 0.5 : 0;
  // Token-overlap component: count distinct content tokens (drops stopwords / 1-char).
  const textTokens = new Set(tokenize(text));
  let hits = 0;
  for (const w of words) {
    if (textTokens.has(w) || lower.includes(w)) hits += 1;
  }
  const overlap = hits / words.length;
  return Math.min(1, overlap * 0.7 + phraseHit);
}

/**
 * Return the most concept-relevant excerpt from the full source text.
 *
 * Backed by the same BM25 corpus the Agent uses, so the workspace lesson,
 * Feynman reference, debate seed, and annotation context all see the same
 * "best slices" for the concept. Falls back to section-level heuristics for
 * very short inputs where chunking would over-fragment.
 */
export function relevantExcerpt(text: string, concept: string, maxChars = 10000): string {
  if (!text.trim()) return '';

  // Short documents: pre-BM25 path on whole sections (cheap + readable).
  if (text.length < 1500) {
    const sections = detectSections(text);
    type Chunk = { body: string; score: number };
    const chunks: Chunk[] = [];
    if (sections.length > 0) {
      for (const s of sections) {
        const body = (s.heading ? `${s.heading}\n\n` : '') + s.text;
        chunks.push({ body, score: conceptRelevanceScore(body, concept) });
      }
    } else {
      const paras = text.split(/\n{2,}/).filter((p) => p.trim().length > 40);
      for (const p of paras) chunks.push({ body: p.trim(), score: conceptRelevanceScore(p, concept) });
    }
    chunks.sort((a, b) => b.score - a.score);
    const picked: string[] = [];
    let len = 0;
    for (const c of chunks) {
      if (c.score < 0.1 && picked.length >= 2) break;
      if (len + c.body.length > maxChars) {
        const room = maxChars - len;
        if (room > 200) picked.push(c.body.slice(0, room) + '…');
        break;
      }
      picked.push(c.body);
      len += c.body.length;
      if (len >= maxChars) break;
    }
    return picked.length > 0 ? picked.join('\n\n') : text.slice(0, maxChars);
  }

  // Larger inputs: build a one-shot BM25 corpus over rag-style chunks and
  // pull the top hits for the concept query. We add a hard fallback so we
  // never return empty when the BM25 score is zero (e.g. truly novel query).
  const chunks = chunkText(text, 'note', 'note');
  const corpus = buildCorpusFromChunks(chunks);
  const k = Math.max(2, Math.min(10, Math.ceil(maxChars / 700)));
  const hits = retrieve(concept, corpus, k);
  if (hits.length === 0) {
    return text.slice(0, maxChars);
  }
  const picked: string[] = [];
  let len = 0;
  // Re-order hits by chunk index so the excerpt reads in document order.
  const ordered = hits.slice().sort((a, b) => a.chunk.charStart - b.chunk.charStart);
  for (const { chunk } of ordered) {
    const body = (chunk.heading ? `${chunk.heading}\n\n` : '') + chunk.text.trim();
    if (len + body.length > maxChars) {
      const room = maxChars - len;
      if (room > 200) picked.push(body.slice(0, room) + '…');
      break;
    }
    picked.push(body);
    len += body.length;
  }
  return picked.length > 0 ? picked.join('\n\n') : text.slice(0, maxChars);
}

/** Return the top-k BM25 hits for a concept against arbitrary text. */
export function topRelevantChunks(text: string, concept: string, k = 4): SourceChunk[] {
  if (!text.trim()) return [];
  const chunks = chunkText(text, 'note', 'note');
  const corpus = buildCorpusFromChunks(chunks);
  return retrieve(concept, corpus, k).map((h) => h.chunk);
}

export function findMatchingTopic(topics: Topic[], concept: string): Topic | undefined {
  const key = normalizeConcept(concept);
  return topics.find((t) => {
    const tk = normalizeConcept(t.title);
    if (tk === key || tk.includes(key) || key.includes(tk)) return true;
    return (t.keyConcepts ?? []).some((c) => {
      const ck = normalizeConcept(c);
      return ck === key || ck.includes(key) || key.includes(ck);
    });
  });
}

/* ------------------------------------------------------------------ *
 * Formulas
 * ------------------------------------------------------------------ */

export interface ExtractedFormula {
  id: string;
  name: string;
  formula: string;
}

const FORMULA_LINE =
  /(?:^|\n)\s*(?:Formula|Τύπος|Equation|Ισοδύναμο|Expression)?\s*:?\s*([A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9_²³*+\-/()=.,%Δ\s]{4,80}=[A-Za-zΑ-Ωα-ω0-9_²³*+\-/().,%Δ\s]{2,80})/gim;

const INLINE_MATH_DELIMITERS = /\\\[([^\\]+)\\\]|\\\(([^\\]+)\\\)|\$\$?([^$]+)\$\$?/g;

const MATH_EXPRESSION =
  /([A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9_²³*+\-/()=.,%Δ\s]*(?:=|≥|≤|≈|→|⇒)[A-Za-zΑ-Ωα-ω0-9_²³*+\-/().,%Δ\s]{2,80})/g;

export function extractFormulas(text: string, concept?: string, max = 8): ExtractedFormula[] {
  const excerpt = concept ? relevantExcerpt(text, concept, 12000) : text;
  const out: ExtractedFormula[] = [];
  const seen = new Set<string>();

  const add = (raw: string, label?: string) => {
    const formula = raw.replace(/\s+/g, ' ').trim();
    if (formula.length < 5 || formula.length > 120) return;
    if (!/[=≥≤≈→⇒]/.test(formula) && !/\$|\\/.test(formula)) return;
    const k = normalizeConcept(formula);
    if (seen.has(k)) return;
    seen.add(k);
    const name = label?.trim() || formula.split(/[=≥≤≈→⇒]/)[0]?.trim() || `Formula ${out.length + 1}`;
    out.push({ id: `nf-${out.length}`, name: name.slice(0, 48), formula });
  };

  for (const m of excerpt.matchAll(INLINE_MATH_DELIMITERS)) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (raw) add(raw.trim(), 'LaTeX');
    if (out.length >= max) return out;
  }

  for (const m of excerpt.matchAll(FORMULA_LINE)) {
    add(m[1]!);
    if (out.length >= max) return out;
  }

  for (const m of excerpt.matchAll(MATH_EXPRESSION)) {
    add(m[1]!);
    if (out.length >= max) return out;
  }

  for (const s of splitSentences(excerpt)) {
    if (!/[=≥≤≈]/.test(s) || s.length > 140) continue;
    const eq = s.match(/([A-Za-zΑ-Ω][A-Za-zΑ-Ω0-9_²³]*\s*[=≥≤≈]\s*[^.]{3,60})/);
    if (eq) add(eq[1]!, titleCasePhrase((concept ?? 'Key').toLowerCase()));
    if (out.length >= max) break;
  }

  return out;
}

/**
 * Convert a plain-text formula into a best-effort LaTeX string for rendering.
 * Handles Greek letters, superscripts/subscripts, common operators, and
 * fractions written as a/b.
 */
export function formulaToLatex(formula: string): string {
  let out = formula.trim();
  if (out.startsWith('$') && out.endsWith('$')) {
    return out.slice(1, -1);
  }
  if (out.startsWith('\\(') && out.endsWith('\\)')) {
    return out.slice(2, -2);
  }

  // Greek letters.
  const greek: Record<string, string> = {
    α: '\\alpha', β: '\\beta', γ: '\\gamma', δ: '\\delta', ε: '\\epsilon', ζ: '\\zeta',
    η: '\\eta', θ: '\\theta', ι: '\\iota', κ: '\\kappa', λ: '\\lambda', μ: '\\mu',
    ν: '\\nu', ξ: '\\xi', ο: 'o', π: '\\pi', ρ: '\\rho', σ: '\\sigma', τ: '\\tau',
    υ: '\\upsilon', φ: '\\phi', χ: '\\chi', ψ: '\\psi', ω: '\\omega',
    Δ: '\\Delta', Σ: '\\Sigma', Π: '\\Pi', Θ: '\\Theta', Λ: '\\Lambda', Ω: '\\Omega',
  };
  out = out.replace(/[Α-Ωα-ω]/gu, (ch) => greek[ch] ?? ch);

  // Superscripts ² and ³.
  out = out.replace(/²/g, '^{2}').replace(/³/g, '^{3}');

  // Fractions a/b where a and b are simple terms.
  out = out.replace(/\b([A-Za-z0-9_{}\\]+)\s*\/\s*([A-Za-z0-9_{}\\]+)\b/g, '\\frac{$1}{$2}');

  // Square root sqrt(...).
  out = out.replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');

  return out;
}

/* ------------------------------------------------------------------ *
 * Comparisons (Σύγκριση tool)
 *
 * Three layers, in order of richness:
 *   1. Markdown comparison tables (| header | col-A | col-B |)        — structured.
 *   2. Sentence patterns ("X vs Y", "compared to", "unlike", "ενώ", …) — semi-structured.
 *   3. Glossary co-occurrence + definitions                            — fallback.
 * ------------------------------------------------------------------ */

const COMPARE_PATTERNS: RegExp[] = [
  /\b(.{4,50}?)\s+(?:vs\.?|versus|compared to|unlike|whereas|while|in contrast to|differs from)\s+(.{4,80}?)[.;]/gi,
  /\b(.{4,50}?)\s+(?:ενώ|αντίθετα|σε αντίθεση|σε σύγκριση με|διαφέρει από)\s+(.{4,80}?)[.;]/gi,
];

export function extractComparisons(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
): [string, string, string][] {
  const excerpt = relevantExcerpt(text, concept, 14000);
  const rows: [string, string, string][] = [];
  const seen = new Set<string>();

  const push = (dim: string, a: string, b: string) => {
    const d = dim.trim().slice(0, 80);
    const left = a.trim().slice(0, 100);
    const right = b.trim().slice(0, 100);
    if (left.length < 2 || right.length < 2) return;
    const k = `${d}|${left}|${right}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push([d || concept, left, right]);
  };

  // 1) Structured: Markdown and plain-text comparison tables in the source notes.
  const tables = extractTables(excerpt);
  for (const tbl of tables) {
    for (const r of tableToComparisonRows(tbl, concept)) {
      push(r[0], r[1], r[2]);
      if (rows.length >= 6) return rows;
    }
  }

  // 2) Semi-structured: explicit "X vs Y" / "ενώ" / "compared to" sentences.
  for (const re of COMPARE_PATTERNS) {
    re.lastIndex = 0;
    for (const m of excerpt.matchAll(re)) {
      push('Comparison', m[1]!, m[2]!);
      if (rows.length >= 6) return rows;
    }
  }

  // 3) Glossary pairs that co-occur in the same sentence → implicit contrast rows.
  const sentences = splitSentences(excerpt);
  const terms = glossary
    .filter((g) => conceptRelevanceScore(g.definition + g.term, concept) > 0.2)
    .slice(0, 10);
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i]!;
      const b = terms[j]!;
      const shared = sentences.find(
        (s) => s.toLowerCase().includes(a.term.toLowerCase()) && s.toLowerCase().includes(b.term.toLowerCase()),
      );
      if (shared) {
        push(`${a.term} vs ${b.term}`, a.definition.slice(0, 80), b.definition.slice(0, 80));
      }
      if (rows.length >= 6) return rows;
    }
  }

  // Last resort: definitions from the excerpt as one-sided rows.
  if (rows.length === 0) {
    const defs = extractDefinitions(excerpt, 6).filter(
      (d) => conceptRelevanceScore(d.definition, concept) > 0.25,
    );
    for (const d of defs.slice(0, 4)) {
      push(d.term, d.definition.slice(0, 80), '—');
    }
  }

  if (rows.length === 0) {
    rows.push(...buildFallbackComparisons(text, concept));
  }

  return rows;
}

/* ------------------------------------------------------------------ *
 * Flashcards (Leitner)
 * ------------------------------------------------------------------ */

export type Flashcard = {
  front: string;
  back: string;
  citation?: ContentCitation;
};

export function buildFlashcards(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
  sourceFiles: UploadedFile[] = [],
): Flashcard[] {
  const excerpt = relevantExcerpt(text, concept, 12000);
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  const add = (front: string, back: string, anchor?: string) => {
    const f = front.trim();
    const b = back.trim();
    if (f.length < 2 || b.length < 8) return;
    if (isStudyToolExcludedText(f) || isStudyToolExcludedText(b)) return;
    const k = normalizeConcept(f);
    if (seen.has(k)) return;
    seen.add(k);
    const citation = sourceFiles.length > 0
      ? resolveContentCitation(sourceFiles, anchor ?? b) ?? undefined
      : undefined;
    cards.push({ front: f, back: b.slice(0, 280), ...(citation ? { citation } : {}) });
  };

  const scopedGlossary = glossary.filter(
    (g) => conceptRelevanceScore(g.term + ' ' + g.definition, concept) > 0.15,
  );
  for (const g of scopedGlossary.slice(0, 12)) {
    add(g.term, g.definition);
  }

  for (const d of extractDefinitions(excerpt, 10)) {
    if (isStudyToolExcludedText(d.definition)) continue;
    add(d.term, d.definition);
  }

  const sentences = splitSentences(excerpt).filter(
    (s) => !isStudyToolExcludedText(s) && conceptRelevanceScore(s, concept) > 0.3,
  );
  for (const s of sentences.slice(0, 4)) {
    const words = conceptWords(concept);
    const hit = words.find((w) => s.toLowerCase().includes(w));
    if (hit) {
      add(
        t('flashcardWhatIsTrue', lang).replace('{term}', hit),
        s,
      );
    }
  }

  if (cards.length === 0 && concept) {
    const summary = extractiveSummary(excerpt, 1, { biasTerms: [concept] })[0];
    if (summary) {
      add(concept, summary);
    }
  }

  return cards.slice(0, 16);
}

/* ------------------------------------------------------------------ *
 * Quiz from notes
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Distractor selection
 * ------------------------------------------------------------------ */

function termTokens(s: string): Set<string> {
  return new Set(tokenize(s));
}

function termJaccard(a: string, b: string): number {
  const A = termTokens(a);
  const B = termTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Rank glossary terms by *near-miss* similarity to the correct answer:
 * shares some tokens (so it looks plausible) but is not the same concept.
 * The earlier MVP just took the first 3 entries, which produced trivially
 * obvious wrong answers. SBERT-style cosine would be better still, but is
 * gated on embeddings; this is a strong fully-offline default.
 */
export function rankDistractorTerms(
  glossary: GlossaryEntry[],
  correctTerm: string,
  count: number,
): string[] {
  const correctNorm = normalizeConcept(correctTerm);
  type Cand = { term: string; score: number; lengthDelta: number };
  const cands: Cand[] = [];
  for (const g of glossary) {
    const norm = normalizeConcept(g.term);
    if (!norm || norm === correctNorm) continue;
    const j = termJaccard(g.term, correctTerm);
    cands.push({ term: g.term, score: j, lengthDelta: Math.abs(g.term.length - correctTerm.length) });
  }
  // Sort: similarity first, then closer length (so options feel uniform)
  cands.sort((a, b) => (b.score - a.score) || (a.lengthDelta - b.lengthDelta));
  const out: string[] = [];
  const seen = new Set<string>([correctNorm]);
  for (const c of cands) {
    const k = normalizeConcept(c.term);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c.term);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Rank sentence-shaped distractors:
 *   - prefer sentences that share at least one content token with the
 *     concept (so they're "in the neighbourhood")
 *   - but score lower if they overlap too closely with the correct sentence
 *   - cap by length similarity so we don't mix a 30-word and a 5-word option.
 */
export function rankDistractorSentences(
  candidates: string[],
  correct: string,
  concept: string,
  count: number,
): string[] {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const correctNorm = norm(correct);
  type Scored = { s: string; sim: number; lenDelta: number };
  const scored: Scored[] = [];
  for (const s of candidates) {
    const n = norm(s);
    if (n === correctNorm) continue;
    if (n.length < 25) continue;
    const conceptOverlap = termJaccard(s, concept);
    const correctOverlap = termJaccard(s, correct);
    const sim = conceptOverlap * 0.6 - correctOverlap * 0.4;
    if (sim <= 0) continue;
    scored.push({ s, sim, lenDelta: Math.abs(s.length - correct.length) });
  }
  scored.sort((a, b) => (b.sim - a.sim) || (a.lenDelta - b.lenDelta));
  return scored.slice(0, count).map((x) => x.s);
}

/**
 * Stable, deterministic option shuffling.
 *
 * The previous implementation used `Math.random` which (a) re-rendered the
 * options on every React render, breaking the user's reading flow, and (b)
 * had a bug where the MC variant always kept the correct answer at index 0
 * because we re-spread it as the first entry before shuffling the rest.
 *
 * We now derive a seed from the concept + the correct answer text so the
 * order is reproducible per question, and Fisher–Yates shuffle the *full*
 * options array (including the correct one).
 */
function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function buildMcQuizFromNotes(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
): QuizDef | null {
  const excerpt = relevantExcerpt(text, concept, 10000);
  const sentences = splitSentences(excerpt).filter(
    (s) => !isStudyToolExcludedText(s) && conceptRelevanceScore(s, concept) > 0.25,
  );

  // Prefer cloze from glossary (P1 quality): pick the term most relevant to concept.
  const scopedTerms = glossary
    .map((g) => ({ g, rel: conceptRelevanceScore(g.term + ' ' + g.definition, concept) }))
    .filter((x) => x.rel > 0.2)
    .sort((a, b) => b.rel - a.rel)
    .slice(0, 5);
  for (const { g } of scopedTerms) {
    const escaped = g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blanked = g.definition.replace(new RegExp(escaped, 'i'), '___');
    if (!blanked.includes('___') || blanked.length < 20) continue;
    const correct = g.term;
    const distractors = rankDistractorTerms(glossary, correct, 3);
    while (distractors.length < 3) {
      distractors.push(t('quizUnrelatedTerm', lang));
    }
    const options = [correct, ...distractors.slice(0, 3)];
    const shuffled = seededShuffle(options, seedFromString(`${concept}|${correct}`));
    return {
      question: t('quizFillInTerm', lang).replace('{blanked}', blanked.slice(0, 120)),
      options: shuffled,
      correctIndex: Math.max(0, shuffled.indexOf(correct)),
    };
  }

  if (sentences.length === 0) return null;

  const correct = sentences.sort((a, b) => b.length - a.length)[0]!;
  const question = t('quizBestStatement', lang).replace('{concept}', concept);

  const distractors: string[] = [];
  const otherDefs = glossary
    .filter((g) => g.definition && g.definition !== correct)
    .map((g) => `${g.term}: ${g.definition.slice(0, 90)}`);
  const nearGlossary = rankDistractorSentences(otherDefs, correct, concept, 2);
  distractors.push(...nearGlossary);
  const otherSentences = sentences.filter((s) => s !== correct).map((s) => s.slice(0, 120));
  const nearSentences = rankDistractorSentences(otherSentences, correct, concept, 3 - distractors.length);
  distractors.push(...nearSentences);

  while (distractors.length < 3) {
    distractors.push(t('quizNotInNotes', lang));
  }

  const correctClipped = correct.slice(0, 140);
  const allOptions = [correctClipped, ...distractors.slice(0, 3).map((d) => d.slice(0, 140))];
  const shuffled = seededShuffle(allOptions, seedFromString(`${concept}|${correctClipped}`));
  const correctIndex = shuffled.indexOf(correctClipped);
  return { question, options: shuffled, correctIndex: correctIndex >= 0 ? correctIndex : 0 };
}

function buildMatchingQuizFromGlossary(
  glossary: GlossaryEntry[],
  concept: string,
  lang: Lang,
): QuizDef | null {
  const scoped = glossary
    .filter((g) => g.definition && g.definition.length >= 12)
    .map((g) => ({ g, rel: conceptRelevanceScore(g.term + ' ' + g.definition, concept) }))
    .filter((x) => x.rel > 0.15)
    .sort((a, b) => b.rel - a.rel)
    .slice(0, 4);
  if (scoped.length < 3) return null;

  const left = scoped.map(({ g }) => g.term.slice(0, 48));
  const right = scoped.map(({ g }) => g.definition.slice(0, 72));
  const shuffledRight = seededShuffle(right.map((r, i) => ({ r, i })), seedFromString(`${concept}|match`));
  const newRight = shuffledRight.map((x) => x.r);
  const pairs: [number, number][] = left.map((_, li) => {
    const origDef = right[li]!;
    const ri = newRight.indexOf(origDef);
    return [li, ri >= 0 ? ri : li];
  });

  return {
    kind: 'matching',
    question: t('quizMatchTerms', lang).replace('{concept}', concept),
    left,
    right: newRight,
    pairs,
  };
}

function buildOrderingQuizFromNotes(
  text: string,
  concept: string,
  lang: Lang,
): QuizDef | null {
  const excerpt = relevantExcerpt(text, concept, 12000);
  const sentences = splitSentences(excerpt)
    .filter((s) => s.length >= 40 && conceptRelevanceScore(s, concept) > 0.25)
    .slice(0, 4);
  if (sentences.length < 3) return null;

  const items = sentences.map((s) => s.slice(0, 100));
  const shuffledItems = seededShuffle(items, seedFromString(`${concept}|order`));
  const correctOrder = items.map((orig) => shuffledItems.indexOf(orig));

  return {
    kind: 'ordering',
    question: t('quizOrderSentences', lang).replace('{concept}', concept),
    items: shuffledItems,
    correctOrder,
  };
}

function buildShortAnswerQuizFromGlossary(
  glossary: GlossaryEntry[],
  concept: string,
  lang: Lang,
): QuizDef | null {
  const hit = glossary
    .map((g) => ({ g, rel: conceptRelevanceScore(g.term + ' ' + g.definition, concept) }))
    .filter((x) => x.g.definition && x.g.definition.length >= 20 && x.rel > 0.25)
    .sort((a, b) => b.rel - a.rel)[0];
  if (!hit) return null;

  return {
    kind: 'short-answer',
    question: t('quizWhichTermDefined', lang).replace('{definition}', hit.g.definition.slice(0, 140)),
    acceptedAnswers: [hit.g.term, hit.g.term.toLowerCase()],
    hint: t('quizShortAnswerHint', lang),
  };
}

export function buildQuizFromNotes(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
): QuizDef | null {
  const variant = seedFromString(`${concept}|quiz-kind`) % 4;
  const builders = [
    () => buildMatchingQuizFromGlossary(glossary, concept, lang),
    () => buildOrderingQuizFromNotes(text, concept, lang),
    () => buildShortAnswerQuizFromGlossary(glossary, concept, lang),
    () => buildMcQuizFromNotes(text, concept, glossary, lang),
  ];
  for (let i = 0; i < builders.length; i++) {
    const q = builders[(variant + i) % builders.length]!();
    if (q) return q;
  }
  return buildFallbackQuizFromPassage(text, concept, glossary, lang);
}

/** IRT-guided quiz selection — tries builders closest to target difficulty first (W7). */
export function buildAdaptiveQuizFromNotes(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
  ability: number,
  conceptMastery: number,
): QuizDef | null {
  const target = targetQuizDifficulty(ability, conceptMastery);
  const candidates: { build: () => QuizDef | null; difficulty: number }[] = [
    { build: () => buildMatchingQuizFromGlossary(glossary, concept, lang), difficulty: 2.4 },
    { build: () => buildOrderingQuizFromNotes(text, concept, lang), difficulty: 2.0 },
    { build: () => buildShortAnswerQuizFromGlossary(glossary, concept, lang), difficulty: 1.6 },
    { build: () => buildMcQuizFromNotes(text, concept, glossary, lang), difficulty: 1.0 },
  ];
  candidates.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
  for (const c of candidates) {
    const q = c.build();
    if (q) return q;
  }
  return buildQuizFromNotes(text, concept, glossary, lang);
}

/* ------------------------------------------------------------------ *
 * Workspace step rail (from note sections)
 * ------------------------------------------------------------------ */

const STEP_TYPES_EN = ['Core Concept', 'Deep Dive', 'Key Insight', 'Practice', 'Quiz'];
const STEP_TYPES_EL = ['Βασική Έννοια', 'Εμβάθυνση', 'Βασική Ιδέα', 'Εξάσκηση', 'Κουίζ'];
const GENERIC_TURN_HEADINGS = new Set([
  'user', 'assistant', 'system', 'tool',
  'q', 'a', 'question', 'answer',
  'speaker 1', 'speaker 2',
]);

function cleanStepHeading(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*(?:\d+(?:\.\d+)*|chapter|κεφάλαιο|section|ενότητα|unit|module|part|μέρος)[).:\s-]*/i, '')
    .replace(/^[•\-–—*·\d.)\s]+/, '')
    .replace(/[:.]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionFallbackTitle(text: string, concept: string): string {
  const phrase = titleCasePhrase(rankKeyphrases(text, 1)[0]?.phrase ?? concept).trim();
  return phrase || concept;
}

function makeStepTitle(
  section: { heading?: string; text: string },
  concept: string,
  lang: Lang = 'en',
): string {
  let heading = cleanStepHeading(section.heading ?? '');
  if (!heading || isGenericSectionHeading(heading)) {
    heading = cleanStepHeading(inferSectionTitleFromBody(section.text) ?? heading);
  }
  if (heading) {
    if (!GENERIC_TURN_HEADINGS.has(heading.toLowerCase()) && !isGenericSectionHeading(heading)) {
      if (isLectureHeadingText(heading) || !isGarbageStepTitle(heading)) {
        return heading.slice(0, 42);
      }
    }
    const preview = section.text.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
    if (preview && !isGarbageStepTitle(preview)) {
      return `${heading}: ${preview}`.slice(0, 42);
    }
  }
  const fallback = sectionFallbackTitle(section.text, concept);
  return sanitizeStepTitle(fallback, concept, lang).slice(0, 42);
}

function isMeaningfulStepSection(section: { heading?: string; text: string }): boolean {
  if (isGenericSectionHeading(section.heading)) {
    return Boolean(inferSectionTitleFromBody(section.text));
  }
  return section.text.trim().length >= 20 || Boolean(section.heading?.trim());
}

function dedupeStepSectionsByTitle(
  sections: { heading?: string; text: string }[],
  concept: string,
): { heading?: string; text: string }[] {
  const seen = new Set<string>();
  const out: { heading?: string; text: string }[] = [];
  for (const section of sections) {
    const title = makeStepTitle(section, concept).toLowerCase();
    if (isGarbageStepTitle(title)) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    out.push(section);
  }
  return out;
}

function hasExplicitSectionTitle(section: { heading?: string; text: string }): boolean {
  if (section.heading && !isGenericSectionHeading(section.heading)) return true;
  return Boolean(inferSectionTitleFromBody(section.text));
}

function selectStructuredStepSections(
  sections: { heading?: string; text: string }[],
  concept: string,
  maxSections = 5,
): { heading?: string; text: string }[] {
  const scored = sections.map((section, index) => ({
    section,
    index,
    score: conceptRelevanceScore(`${section.heading ?? ''}\n${section.text}`, concept),
  }));
  const best = scored
    .slice()
    .sort((a, b) => b.score - a.score)[0];
  if (!best) return [];

  const leftBudget = Math.min(best.index, Math.floor((maxSections - 1) / 2));
  let start = Math.max(0, best.index - leftBudget);
  let end = Math.min(scored.length, start + maxSections);
  if (end - start < Math.min(2, scored.length)) {
    start = Math.max(0, end - Math.min(maxSections, scored.length));
  }

  const windowed = dedupeStepSectionsByTitle(
    scored
      .slice(start, end)
      .filter(({ section, score, index }) =>
        isMeaningfulStepSection(section) &&
        (hasExplicitSectionTitle(section) || score > 0.05 || index === best.index),
      )
      .map(({ section }) => section),
    concept,
  );

  if (windowed.length >= 2) return windowed.slice(0, maxSections);

  return dedupeStepSectionsByTitle(
    scored
      .filter(({ section }) => isMeaningfulStepSection(section))
      .sort((a, b) => a.index - b.index)
      .slice(0, maxSections * 2)
      .map(({ section }) => section),
    concept,
  ).slice(0, maxSections);
}

/** Detect worked-example / numeric exercise sentences in the material. */
export function extractWorkedExamples(text: string, concept: string, max = 4): string[] {
  const excerpt = relevantExcerpt(text, concept, 14000);
  const markers = /\b(example|for instance|e\.g\.|suppose|given|calculate|solve|παράδειγμα|υποθέστε|δεδομέν|υπολογί)/i;
  return splitSentences(excerpt)
    .filter((s) => markers.test(s) && conceptRelevanceScore(s, concept) > 0.2)
    .slice(0, max);
}

/** Minimum lesson rail when structured steps cannot be inferred from source text. */
export function fallbackWorkspaceSteps(
  concept: string,
  lang: Lang,
): { title: string; type: string }[] {
  return [
    {
      title: concept.trim() || t('studyLabel', lang),
      type: t('coreConcept', lang),
    },
    {
      title: t('knowledgeCheck', lang),
      type: t('quiz', lang),
    },
  ];
}

export function buildWorkspaceStepsFromNotes(
  text: string,
  concept: string,
  lang: Lang,
): { title: string; type: string }[] | null {
  const excerpt = relevantExcerpt(text, concept, 16000);
  const segmentSections = readerSegmentsToStepSections(buildReaderSegments(text), lang);
  const types = lang === 'el' ? STEP_TYPES_EL : STEP_TYPES_EN;
  const quizStep = {
    title: t('knowledgeCheck', lang),
    type: t('quiz', lang),
  };

  const structuredSections = segmentSections.length >= 2
    ? segmentSections
    : selectStructuredStepSections(detectSections(text), concept, 5);

  if (structuredSections.length >= 2) {
    const steps = structuredSections.map((s, i) => ({
      title: makeStepTitle(s, concept, lang),
      type: types[Math.min(i, types.length - 2)] ?? types[0]!,
    })).filter((s) => !isGarbageStepTitle(s.title));
    const examples = extractWorkedExamples(excerpt, concept, 1);
    const hasPracticeLikeTitle = steps.some((step) =>
      /\b(example|exercise|practice|παράδειγμα|άσκηση|εξάσκηση)\b/i.test(step.title),
    );
    if (examples.length > 0 && steps.length < 5 && !hasPracticeLikeTitle) {
      steps.push({
        title: t('examplePrefix', lang) + examples[0]!.slice(0, 32) + '…',
        type: t('practice', lang),
      });
    }
    if (steps.length >= 2) return [...steps, quizStep];
  }

  const keyphrases = rankKeyphrases(excerpt, 8)
    .filter((k) => conceptRelevanceScore(k.phrase, concept) > 0.1)
    .filter((k) => !isGarbageStepTitle(k.phrase));
  if (keyphrases.length >= 2) {
    const steps = keyphrases.slice(0, 4).map((k, i) => ({
      title: sanitizeStepTitle(titleCasePhrase(k.phrase), concept, lang).slice(0, 42),
      type: types[Math.min(i, types.length - 2)] ?? types[0]!,
    }));
    steps.push({
      title: t('workedExample', lang),
      type: t('practice', lang),
    });
    return [...steps, quizStep];
  }

  const summaries = extractiveSummary(excerpt, 3, { biasTerms: [concept], leadBias: 0.1 });
  if (summaries.length >= 2) {
    return [
      ...summaries.slice(0, 4)
        .map((s) => s.slice(0, 48) + (s.length > 48 ? '…' : ''))
        .filter((title) => !isGarbageStepTitle(title))
        .map((title, i) => ({
        title,
        type: types[Math.min(i, types.length - 2)] ?? types[0]!,
      })),
      quizStep,
    ];
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Concept map from course outline
 * ------------------------------------------------------------------ */

export interface ConceptMapNode {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory';
  x: number;
  y: number;
  note?: string;
}

export interface ConceptMapEdge {
  from: string;
  to: string;
  relation: 'prerequisite' | 'related' | 'contrasts';
  /** Pointwise mutual information when the edge was inferred from co-occurrence (TOOL-CM-03). */
  pmi?: number;
}

function slugify(label: string, i: number): string {
  const base = normalizeConcept(label).replace(/\s+/g, '-').slice(0, 24);
  return base || `n${i}`;
}

export function buildConceptMapFromCourse(
  topics: Topic[],
  glossary: GlossaryEntry[],
  conceptBars: { concept: string; mastery: number }[],
  focusConcept: string,
  sourceText?: string,
): { nodes: ConceptMapNode[]; edges: ConceptMapEdge[] } {
  if (topics.length === 0) {
    return { nodes: [], edges: [] };
  }

  const focusKey = normalizeConcept(focusConcept);
  const sorted = [...topics].sort((a, b) => a.order - b.order);
  const focusIdx = sorted.findIndex(
    (t) => normalizeConcept(t.title) === focusKey || conceptRelevanceScore(t.title, focusConcept) > 0.5,
  );
  const window = focusIdx >= 0
    ? sorted.slice(Math.max(0, focusIdx - 2), focusIdx + 4)
    : sorted.slice(0, 6);

  const nodes: ConceptMapNode[] = [];
  const idByTitle = new Map<string, string>();
  const cx = 320;
  const cy = 200;
  const radius = 140;

  window.forEach((t, i) => {
    const angle = (i / Math.max(window.length, 1)) * Math.PI * 1.6 - Math.PI * 0.3;
    const id = slugify(t.title, i);
    idByTitle.set(t.title, id);
    const match = conceptBars.find((b) => conceptRelevanceScore(b.concept, t.title) > 0.4);
    const isFocus = conceptRelevanceScore(t.title, focusConcept) > 0.45;
    nodes.push({
      id,
      label: t.title,
      type: 'concept',
      x: Math.round(cx + Math.cos(angle) * radius),
      y: Math.round(cy + Math.sin(angle) * radius * 0.7),
      mastery: match?.mastery ?? (isFocus ? 45 : 0),
      note: t.objectives?.[0]?.slice(0, 80),
    });
  });

  const edges: ConceptMapEdge[] = [];
  for (const t of window) {
    const toId = idByTitle.get(t.title);
    if (!toId) continue;
    for (const prereq of t.prerequisites ?? []) {
      const fromId = idByTitle.get(prereq);
      if (fromId && fromId !== toId) {
        edges.push({ from: fromId, to: toId, relation: 'prerequisite' });
      }
    }
  }

  // Add glossary terms linked to focus concept.
  const relatedTerms = glossary
    .filter((g) => conceptRelevanceScore(g.term + g.definition, focusConcept) > 0.25)
    .slice(0, 4);
  relatedTerms.forEach((g, i) => {
    const id = slugify(g.term, 100 + i);
    if (nodes.some((n) => n.id === id)) return;
    nodes.push({
      id,
      label: g.term,
      type: g.definition.includes('=') ? 'formula' : 'definition',
      x: 80 + i * 90,
      y: 360,
      mastery: 0,
      note: g.definition.slice(0, 60),
    });
    const focusNode = nodes.find((n) => conceptRelevanceScore(n.label, focusConcept) > 0.45);
    if (focusNode) edges.push({ from: focusNode.id, to: id, relation: 'related' });
  });

  if (sourceText?.trim()) {
    edges.push(...inferCooccurrenceEdges(sourceText, nodes, focusConcept, edges));
  }

  return { nodes, edges };
}

/**
 * Add `related` edges when node labels co-occur frequently in nearby
 * sentences. The previous implementation only checked the first occurrence
 * of each token (`indexOf`), so it would attach edges between any pair whose
 * first mentions happened to be in the same paragraph — even when the
 * concepts are unrelated elsewhere in the document.
 *
 * This rewrite slides a sentence window of size W=3 across the source and
 * counts how often each pair of node labels co-occur, then keeps only pairs
 * with a positive Pointwise Mutual Information (PMI) signal:
 *
 *     PMI(a,b) = log2( P(a,b) / (P(a) * P(b)) )
 *
 * The result: spurious "related" edges are suppressed, and pairs that
 * genuinely cluster in the text (e.g. "supply" & "demand", "force" &
 * "acceleration", "antibody" & "antigen") rise to the top.
 */
function inferCooccurrenceEdges(
  text: string,
  nodes: ConceptMapNode[],
  focusConcept: string,
  existing: ConceptMapEdge[],
): ConceptMapEdge[] {
  const excerpt = relevantExcerpt(text, focusConcept, 12000).toLowerCase();
  if (!excerpt.trim() || nodes.length < 2) return [];

  const sentences = splitSentences(excerpt);
  if (sentences.length < 2) return [];

  // Pre-compute, for each sentence, which nodes appear in it (label OR any of
  // its tokens, with the multi-word label treated as a phrase).
  const labelTokens = nodes.map((n) => ({ id: n.id, phrase: n.label.toLowerCase(), words: conceptWords(n.label) }));
  const presence: Set<string>[] = sentences.map((s) => {
    const lower = s.toLowerCase();
    const set = new Set<string>();
    for (const lt of labelTokens) {
      if (lt.phrase.length > 4 && lower.includes(lt.phrase)) {
        set.add(lt.id);
        continue;
      }
      // Require ≥ 1 of the multi-word label tokens present (drops 2-letter coincidences)
      if (lt.words.length === 0) continue;
      const hits = lt.words.filter((w) => w.length >= 4 && lower.includes(w)).length;
      if (hits >= Math.max(1, Math.ceil(lt.words.length / 2))) set.add(lt.id);
    }
    return set;
  });

  const W = 3; // sliding sentence window
  const total = Math.max(1, presence.length - W + 1);
  const single = new Map<string, number>();
  const pair = new Map<string, number>();
  for (let i = 0; i + W <= presence.length; i++) {
    const winSet = new Set<string>();
    for (let k = 0; k < W; k++) for (const id of presence[i + k]!) winSet.add(id);
    const ids = [...winSet];
    for (const id of ids) single.set(id, (single.get(id) ?? 0) + 1);
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const key = ids[a]! < ids[b]! ? `${ids[a]}|${ids[b]}` : `${ids[b]}|${ids[a]}`;
        pair.set(key, (pair.get(key) ?? 0) + 1);
      }
    }
  }

  const seen = new Set(existing.map((e) => `${e.from}|${e.to}|${e.relation}`));
  const out: ConceptMapEdge[] = [];
  type Scored = { a: string; b: string; pmi: number; count: number };
  const scored: Scored[] = [];
  for (const [pairKey, count] of pair) {
    if (count < 2) continue;
    const [a, b] = pairKey.split('|') as [string, string];
    const pa = (single.get(a) ?? 0) / total;
    const pb = (single.get(b) ?? 0) / total;
    const pab = count / total;
    if (pa === 0 || pb === 0) continue;
    const pmi = Math.log2(pab / (pa * pb));
    if (pmi <= 0) continue;
    scored.push({ a, b, pmi, count });
  }
  // Keep at most the top-N edges (cap to keep the map readable)
  scored.sort((x, y) => (y.pmi - x.pmi) || (y.count - x.count));
  const cap = Math.min(8, Math.max(3, Math.round(nodes.length * 0.6)));
  for (const s of scored.slice(0, cap)) {
    const key = `${s.a}|${s.b}|related`;
    const rev = `${s.b}|${s.a}|related`;
    if (seen.has(key) || seen.has(rev)) continue;
    seen.add(key);
    out.push({ from: s.a, to: s.b, relation: 'related', pmi: s.pmi });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Debate tree from claims in notes
 * ------------------------------------------------------------------ */

export interface DebateNode {
  id: string;
  type: 'claim' | 'premise' | 'support' | 'refutation';
  text: string;
  x: number;
  y: number;
  expanded?: boolean;
  children?: DebateNode[];
}

/**
 * Claim mining heuristics.
 *
 * The previous implementation used a single "marker bag" per role and ranked
 * sentences only by concept-relevance — which conflated three different roles
 * (the central thesis, supporting evidence, and refuting counter-arguments)
 * and routinely picked the same sentence for both claim and premise.
 *
 * The new version scores each sentence on three independent axes and assigns
 * it to the role with the highest signal, with rule-based tie-breaking:
 *
 *   - **Claim score**: thesis/conclusion connectives ("therefore", "in
 *     conclusion", "we argue", "the main point", "άρα", "συνεπώς"…) and
 *     epistemic-strength modals ("must", "is", "always").
 *   - **Support score**: evidence connectives ("because", "since", "as
 *     shown by", "for example", "the data", "studies", "διότι", "επειδή"…)
 *     plus numerical density (citations / percentages / years).
 *   - **Refute score**: contrast connectives ("however", "but", "in
 *     contrast", "fails", "objection", "παρόλο", "αντιθέτως"…) and
 *     hedging modals ("may", "might", "rarely", "fails to").
 */
const CLAIM_CONNECTIVES = /\b(therefore|thus|hence|consequently|in conclusion|we (?:argue|claim|show|conclude)|the (?:key|main) point|overall|the central (?:claim|thesis)|άρα|συνεπώς|κατά συνέπεια|καταλήγουμε|υποστηρίζουμε|η κεντρική (?:θέση|ιδέα))\b/i;
const SUPPORT_CONNECTIVES = /\b(because|since|as shown by|for example|for instance|e\.?g\.?|evidence|the data|studies show|in particular|notably|specifically|διότι|επειδή|καθώς|όπως δείχνει|παράδειγμα|τα δεδομένα|μελέτες δείχνουν)\b/i;
const REFUTE_CONNECTIVES = /\b(however|but(?: also)?|although|yet|unless|except|on the contrary|in contrast|nevertheless|nonetheless|critics|objection|fails to|does not|cannot|μη|παρόλο|ωστόσο|αλλά|εν τούτοις|αντιθέτως|αντίθετα|εξαίρεση|αποτυγχάνει|δεν)\b/i;
const HEDGE_MODALS = /\b(may|might|could|sometimes|rarely|seldom|in some cases|μπορεί|ίσως|ενδεχομένως|σπάνια)\b/i;
const STRONG_MODALS = /\b(must|always|never|is|are|will|requires|θα|είναι|πάντα|ποτέ)\b/i;

interface DebateScore {
  sentence: string;
  claim: number;
  support: number;
  refute: number;
  rel: number;
}

function scoreDebateSentence(sentence: string, concept: string): DebateScore {
  const rel = conceptRelevanceScore(sentence, concept);
  const numericHits = (sentence.match(/\b\d+(?:\.\d+)?%?\b/g)?.length ?? 0);
  let claim = 0;
  let support = 0;
  let refute = 0;
  if (CLAIM_CONNECTIVES.test(sentence)) claim += 2;
  if (STRONG_MODALS.test(sentence)) claim += 0.5;
  if (SUPPORT_CONNECTIVES.test(sentence)) support += 2;
  if (numericHits > 0) support += Math.min(1.5, numericHits * 0.5);
  if (REFUTE_CONNECTIVES.test(sentence)) refute += 2;
  if (HEDGE_MODALS.test(sentence)) refute += 0.4;
  return { sentence, claim, support, refute, rel };
}

export function buildDebateTreeFromNotes(text: string, concept: string): DebateNode | null {
  const excerpt = relevantExcerpt(text, concept, 10000);
  const sentences = splitSentences(excerpt).filter((s) => conceptRelevanceScore(s, concept) > 0.2);
  if (sentences.length < 2) {
    return buildFallbackDebateTree(text, concept) as DebateNode | null;
  }

  const scored = sentences.map((s) => scoreDebateSentence(s, concept));

  // Pick the central claim: high claim-score + high concept relevance, but
  // only if such a sentence exists. Otherwise fall back to the most relevant
  // sentence so we don't return null on neutral / descriptive notes.
  const claimSentence =
    [...scored].sort((a, b) => b.claim * 1.5 + b.rel - (a.claim * 1.5 + a.rel))[0]!.sentence;

  const supports = scored
    .filter((s) => s.sentence !== claimSentence && s.support > 0.5 && s.refute < s.support)
    .sort((a, b) => b.support + b.rel * 0.5 - (a.support + a.rel * 0.5))
    .slice(0, 3)
    .map((s) => s.sentence);

  const refutations = scored
    .filter((s) => s.sentence !== claimSentence && s.refute > 0.5 && s.refute >= s.support)
    .sort((a, b) => b.refute + b.rel * 0.5 - (a.refute + a.rel * 0.5))
    .slice(0, 2)
    .map((s) => s.sentence);

  // If no explicit support/refute markers fired, pick neighbours by relevance
  // so the tree always has at least one premise per side when the corpus has
  // enough material.
  if (supports.length === 0) {
    const fallback = scored
      .filter((s) => s.sentence !== claimSentence)
      .sort((a, b) => b.rel - a.rel)
      .slice(0, 2)
      .map((s) => s.sentence);
    supports.push(...fallback);
  }

  const mk = (
    id: string,
    type: DebateNode['type'],
    label: string,
    x: number,
    y: number,
    children?: DebateNode[],
  ): DebateNode => ({
    id,
    type,
    text: label.slice(0, 160),
    x,
    y,
    expanded: true,
    children,
  });

  // Layout: claim at top, supports on the left subtree, refutations on the right.
  const supportNodes = supports.slice(0, 3).map((s, i) => mk(`s${i}`, 'support', s, 120 + i * 160, 250));
  const refuteNodes = refutations.slice(0, 2).map((r, i) => mk(`r${i}`, 'refutation', r, 480 + i * 160, 250));

  const premiseChildren: DebateNode[] = [];
  if (supportNodes.length > 0) {
    premiseChildren.push(mk('p-support', 'premise', 'Supporting evidence', 200, 150, supportNodes));
  }
  if (refuteNodes.length > 0) {
    premiseChildren.push(mk('p-refute', 'premise', 'Counter-arguments', 540, 150, refuteNodes));
  }

  return mk('root', 'claim', claimSentence, 360, 50, premiseChildren);
}

/* ------------------------------------------------------------------ *
 * Feynman + simulator helpers
 * ------------------------------------------------------------------ */

export function buildFeynmanOutline(
  topic: Topic | undefined,
  text: string,
  concept: string,
  lang: Lang,
): string[] {
  const topicMatchesConcept = topic && conceptRelevanceScore(topic.title, concept) >= 0.45;
  if (
    topicMatchesConcept
    && topic?.objectives?.length
    && !isGenericStudyConcept(concept)
  ) {
    return topic.objectives.slice(0, 5);
  }
  if (topicMatchesConcept && topic?.keyConcepts?.length) {
    return topic.keyConcepts.map((c) =>
      t('feynmanExplainItem', lang).replace('{item}', c),
    );
  }
  const phrases = rankKeyphrases(relevantExcerpt(text, concept, 8000), 4)
    .map((k) => titleCasePhrase(k.phrase));
  if (phrases.length > 0) {
    return phrases.map((p) => t('feynmanCoverItem', lang).replace('{item}', p));
  }
  return [
    t('feynmanFallbackOutline1', lang).replace('{concept}', concept),
    t('feynmanFallbackOutline2', lang),
  ];
}

export function buildFeynmanGaps(glossary: GlossaryEntry[], concept: string, lang: Lang): string[] {
  const terms = buildFeynmanGapTerms(glossary, concept);
  if (terms.length === 0) {
    return [t('feynmanGapAccuracy', lang).replace('{concept}', concept)];
  }
  return [t('feynmanIncludeTerms', lang).replace('{terms}', terms.join(', '))];
}

export function buildFeynmanGapTerms(glossary: GlossaryEntry[], concept: string): string[] {
  return glossary
    .filter((g) => conceptRelevanceScore(g.term, concept) > 0.2)
    .slice(0, 4)
    .map((g) => g.term);
}

/**
 * Determine whether the current material supports the parametric sandbox.
 * The current UI is a transitional supply/demand explorer; it is enabled only
 * when the notes contain explicit formulas or quantitative comparisons so it
 * is not domain-specific. A generic parameter explorer is planned for Phase 4
 * (see EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md §5).
 */
export function notesSupportSandbox(text: string, concept: string, formulas: ExtractedFormula[]): boolean {
  if (formulas.length > 0) return true;
  const excerpt = relevantExcerpt(text, concept, 6000);
  return /\b(?:calculate|compute|parameter|variable|value|range|percent|rate|ratio|vs\.?|versus)\b/i.test(excerpt);
}

export function sandboxInsightFromNotes(text: string, concept: string, lang: Lang): string {
  const excerpt = relevantExcerpt(text, concept, 4000);
  const summary = extractiveSummary(excerpt, 1, { biasTerms: [concept] })[0];
  if (summary) return summary.slice(0, 280);
  return t('sandboxAdjustParams', lang).replace('{concept}', concept);
}
