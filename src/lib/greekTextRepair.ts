/**
 * Repair PDF text-layer corruption where Greek (and Latin) glyphs are emitted
 * as single-character tokens separated by spaces (common in Greek university PDFs),
 * or OCR-glued without spaces between words.
 */

const GREEK_SCRIPT = /\p{Script=Greek}/u;
const LATIN_LETTER = /[A-Za-z]/;
const GREEK_LETTERS_ONLY = /^[\p{Script=Greek}]+$/u;

function isSpacedGlyphToken(token: string): boolean {
  if (!token) return false;
  // Isolated letters only — skip labels and punctuation (Q:, supply?, etc.).
  if (/[^\p{L}]/u.test(token)) return false;
  if (token.length === 1 && (GREEK_SCRIPT.test(token) || LATIN_LETTER.test(token))) return true;
  if (token.length === 2 && [...token].every((c) => GREEK_SCRIPT.test(c))) return true;
  return false;
}

/** Short Greek suffix glued after spaced run (e.g. π α ρ α γ ω + γής). */
function isSpacedSuffixToken(token: string): boolean {
  return token.length >= 2
    && token.length <= 5
    && GREEK_LETTERS_ONLY.test(token)
    && /(?:ής|ος|η|ς)$/u.test(token);
}

function isFullWordToken(token: string): boolean {
  if (token.length < 3 || !GREEK_LETTERS_ONLY.test(token)) return false;
  return isLexiconWord(token) || token.length >= 8;
}

/** Repair a single line when PDF kerning split characters with spaces. */
export function repairSpacedGreekLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 4) return line;

  const spacedGlyphs = tokens.filter(isSpacedGlyphToken).length;
  const spacedRatio = spacedGlyphs / tokens.length;
  const hasEmbeddedWords = tokens.some(isFullWordToken);

  // Full-line join only when every letter token is a spaced glyph (no intact words).
  if (spacedRatio >= 0.38 && !hasEmbeddedWords) {
    const joined = tokens.join('');
    if (joined.length >= Math.max(6, Math.floor(tokens.length * 1.5))) {
      return segmentGluedGreekBlob(joined);
    }
  }

  const out: string[] = [];
  let run: string[] = [];

  const flushRun = () => {
    if (run.length === 0) return;
    if (run.length >= 2) out.push(run.join(''));
    else out.push(...run);
    run = [];
  };

  for (const tok of tokens) {
    const inSpacedRun = run.length > 0;
    if (
      isSpacedGlyphToken(tok)
      || (inSpacedRun && isSpacedSuffixToken(tok))
      || (inSpacedRun && spacedRatio >= 0.35 && !isFullWordToken(tok) && GREEK_LETTERS_ONLY.test(tok))
    ) {
      run.push(tok);
    } else {
      flushRun();
      out.push(tok);
    }
  }
  flushRun();

  return segmentGluedGreekBlob(out.join(' '));
}

/** Apply line-level Greek spacing repair across a document body. */
export function repairSpacedGreekText(text: string): string {
  return text
    .split('\n')
    .map((line) => repairSpacedGreekLine(line))
    .join('\n');
}

/** Economics / syllabus vocabulary for glued-word segmentation (longest first). */
const GREEK_LEXICON: string[] = [
  'πλεονεκτήματα', 'πλεονεκτημάτων', 'πλεονεκτήματος',
  'εισοδήματος', 'εισοδήματα', 'εισοδημάτων',
  'παραγωγής', 'παραγωγή', 'παραγωγής',
  'ανταγωνισμός', 'ανταγωνισμό', 'ανταγωνισμού',
  'εργαζόμενους', 'εργαζόμενος', 'εργαζόμενοι',
  'διεθνές', 'διεθνή', 'διεθνής', 'διεθνούς',
  'εμπόριο', 'εμπορίου', 'εμπορία',
  'διανομή', 'διανομής', 'διανομήν',
  'ημεδαπή', 'αλλοδαπή', 'αλλοδαπής',
  'απόλυτα', 'συγκριτικά', 'συγκριτικό',
  'οικονομική', 'οικονομία', 'οικονομίας',
  'μισθό', 'μισθών', 'μισθός',
  'προσφορά', 'ζήτηση', 'ζήτησης',
  'επιτρέπει', 'μειώσουν', 'μειώσει',
  'χώρες', 'χώρα', 'χώρας',
].sort((a, b) => b.length - a.length);

const LEXICON_LOWER = new Set(GREEK_LEXICON.map((w) => w.toLowerCase()));

function normalizeGreekKey(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function isLexiconWord(word: string): boolean {
  if (!word || word.length < 3) return false;
  return LEXICON_LOWER.has(normalizeGreekKey(word));
}

/** Split a continuous Greek blob into lexicon words (e.g. Διανομήεισοδήματος). */
export function segmentGluedGreekBlob(blob: string): string {
  if (!blob || !GREEK_SCRIPT.test(blob)) return blob;

  return blob.replace(/[\p{Script=Greek}]{7,}/gu, (match) => {
    const segmented = segmentSingleGreekBlob(match);
    return segmented ?? match;
  });
}

function segmentSingleGreekBlob(blob: string): string | null {
  if (blob.length < 7) return null;

  const memo = new Map<string, string | null>();

  const dfs = (rest: string): string | null => {
    if (!rest) return '';
    if (memo.has(rest)) return memo.get(rest)!;

    let best: string | null = null;
    for (const word of GREEK_LEXICON) {
      if (word.length > rest.length) continue;
      const head = rest.slice(0, word.length);
      if (normalizeGreekKey(head) !== normalizeGreekKey(word)) continue;
      const tail = dfs(rest.slice(word.length));
      if (tail === null) continue;
      const candidate = tail ? `${head} ${tail}` : head;
      if (!best || candidate.length < best.length) best = candidate;
    }

    memo.set(rest, best);
    return best;
  };

  const result = dfs(blob);
  if (!result || !result.includes(' ')) return null;
  return result;
}

const GLUED_PARTICLES = [
  'και', 'από', 'για', 'στο', 'στη', 'στην', 'στον', 'στους', 'στις', 'στα',
  'της', 'του', 'των',
];

const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/Δύοχώρες/giu, 'Δύο χώρες'],
  [/ΔΥΟΧΩΡΕΣ/giu, 'ΔΥΟ ΧΩΡΕΣ'],
  [/ηαλλοδαπή/giu, 'η αλλοδαπή'],
  [/διεθνέςεμπόριο/giu, 'διεθνές εμπόριο'],
  [/Διανομήεισοδήματος/giu, 'Διανομή εισοδήματος'],
  [/παραγωγήςεισοδήματος/giu, 'παραγωγής εισοδήματος'],
  [/Απόλυταπλεονεκτήματα/giu, 'Απόλυτα πλεονεκτήματα'],
];

/** Insert missing spaces after punctuation before Greek (OCR glue). */
function repairPunctuationGlue(line: string): string {
  return line
    .replace(/(\d)([.)])(?=[\p{Script=Greek}])/gu, '$1$2 ')
    .replace(/([;:,])(?=[\p{Script=Greek}])/gu, '$1 ');
}

/** Split common Greek particles when OCR merged adjacent words. */
function repairParticleGlue(line: string): string {
  let out = line;
  const sorted = [...GLUED_PARTICLES].sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    const re = new RegExp(`(?<=[\\p{Script=Greek}\\d])(?<![\\s\\-])(${word})(?=[\\p{Script=Greek}])`, 'giu');
    out = out.replace(re, ' $1 ');
  }
  return out;
}

/** Article Η glued to η-words (Ηημεδαπή → Η ημεδαπή). */
function repairArticleGlue(line: string): string {
  return line.replace(/(^|[^\p{L}])(Η)(η[α-ωά-ώ]{2,})/giu, '$1$2 $3');
}

/** Articles glued to the next word (τηνπαραγωγή → την παραγωγή). */
function repairLeadingArticles(line: string): string {
  return line.replace(
    /(?<![\p{L}])(την|τον|τα|το)(?=[\p{Script=Greek}]{3,})/giu,
    '$1 ',
  );
}

/** Lowercase→Uppercase Greek boundary (…ηΑλλοδαπή). */
function repairGreekCaseGlue(line: string): string {
  return line.replace(/([\p{Script=Greek}][α-ωά-ώ]{1,})([Α-ΩΆ-Ώ][\p{Script=Greek}]+)/gu, '$1 $2');
}

function repairKnownPhrases(line: string): string {
  let out = line;
  for (const [re, repl] of PHRASE_FIXES) {
    out = out.replace(re, repl);
  }
  return out;
}

/** Repair OCR word glue on a single line (inverse of spaced-glyph corruption). */
export function repairGluedGreekLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;
  let s = trimmed;
  s = repairPunctuationGlue(s);
  s = repairKnownPhrases(s);
  s = repairArticleGlue(s);
  s = repairLeadingArticles(s);
  s = repairParticleGlue(s);
  s = repairGreekCaseGlue(s);
  s = segmentGluedGreekBlob(s);
  // Collapse only accidental double-spaces introduced by particle/article
  // repair; preserve 3+ space runs that signal fixed-gap table gutters so the
  // Reader's table detector can still recognize tabular PDF columns downstream.
  return s.replace(/ {2,}/g, (run) => (run.length >= 3 ? run : ' '));
}

/** Apply OCR glue repair across a document body. */
export function repairGluedGreekText(text: string): string {
  return text
    .split('\n')
    .map((line) => repairGluedGreekLine(line))
    .join('\n');
}

/** Full Greek PDF/OCR repair: spaced glyphs then glued words. */
export function repairGreekDocumentText(text: string): string {
  return repairGluedGreekText(repairSpacedGreekText(text));
}
