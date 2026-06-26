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

  const digitPrefix = trimmed.match(/^(\d+[.)]?)\s+(.+)$/);
  if (digitPrefix) {
    return `${digitPrefix[1]} ${repairSpacedGreekLine(digitPrefix[2]!)}`;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 3) return line;

  const spacedGlyphs = tokens.filter(isSpacedGlyphToken).length;
  const spacedRatio = spacedGlyphs / tokens.length;
  const hasEmbeddedWords = tokens.some(isFullWordToken);

  // Full-line join when every letter token is a spaced glyph (no intact words).
  if (spacedRatio >= 0.38 && !hasEmbeddedWords) {
    const joined = tokens.join('');
    if (joined.length >= Math.max(4, Math.floor(tokens.length * 1.2))) {
      return repairGluedGreekLine(segmentGluedGreekBlob(joined));
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
  'συμπεριφορική', 'ορθολογικής', 'ορθολογική', 'επιλογής', 'επιλογή', 'επιλογές', 'επιλογών',
  'οικονομικές', 'οικονομική', 'πραγματικές', 'πραγματικά', 'καταναλωτής', 'καταναλωτή',
  'προσφοράς', 'προσφορά', 'προσφορές', 'συνάρτηση', 'συνάρτησης', 'παρούσα', 'αξία', 'αξίας',
  'κόστος', 'κόστους', 'μήνες', 'μήνα', 'μήνας', 'σήμερα', 'συνήθως', 'επομένως', 'συνεπώς',
  'πλεονεκτήματα', 'πλεονεκτημάτων', 'πλεονεκτήματος',
  'εισοδήματος', 'εισοδήματα', 'εισοδημάτων',
  'παραγωγής', 'παραγωγή',
  'ανταγωνισμός', 'ανταγωνισμό', 'ανταγωνισμού',
  'εργαζόμενους', 'εργαζόμενος', 'εργαζόμενοι',
  'διεθνές', 'διεθνή', 'διεθνής', 'διεθνούς',
  'εμπόριο', 'εμπορίου', 'εμπορία',
  'διανομή', 'διανομής', 'διανομήν',
  'ημεδαπή', 'αλλοδαπή', 'αλλοδαπής',
  'απόλυτα', 'συγκριτικά', 'συγκριτικό',
  'οικονομία', 'οικονομίας',
  'μισθό', 'μισθών', 'μισθός',
  'ζήτηση', 'ζήτησης',
  'επιτρέπει', 'μειώσουν', 'μειώσει',
  'χώρες', 'χώρα', 'χώρας', 'αποφάσεις', 'αποφάσεων',
  'μετά', 'από', 'έναν', 'ένα', 'ένας', 'μία', 'μια',
  // Varian Ch31 / behavioral economics (present value, hyperbolic discounting)
  'πουθαδοθεί', 'δοθεί', 'δωθεί', 'υπόσχεση', 'λαμβάνει', 'σαμπουάν', 'κομμωτήριο',
  'πληρώνατε', 'πιθανότητα', 'φαινόμενα', 'τοποθετούνται', 'καθαρισμό', 'καθαρισμός',
  'πλήρη', 'απώλεια', 'καμίας', 'ζωής', 'ακριβό', 'χάσετε', 'τρεις', 'μπορεί',
  'αποδίδει', 'δολάριο', 'μικρότερη', 'προεξόφληση', 'αναμονής', 'κερδίσει', 'συνεχίσει',
  'επιθυμία', 'πωλεί', 'σπίτι', 'πληρώνετε', 'χαμηλότερη', 'τιμή', 'προσφορές',
  // Particles needed for DFS tail segmentation
  'θα', 'να', 'ως', 'η', 'ο', 'οι', 'τα', 'το', 'την', 'τον', 'της', 'του', 'των',
  'και', 'για', 'με', 'σε', 'που', 'ότι', 'είναι', 'έχει', 'αυτό', 'αυτή', 'στις', 'στο',
  'στη', 'στην', 'στον', 'στα', 'στους', 'πριν', 'όταν', 'ενώ', 'αλλά', 'άρα', 'μόνο',
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

  let out = blob.replace(/[\p{Script=Greek}]{5,}/gu, (match) => {
    const segmented = segmentSingleGreekBlob(match);
    return segmented ?? match;
  });
  // Re-run on longer runs after first pass may have created new joinable segments.
  out = out.replace(/[\p{Script=Greek}]{7,}/gu, (match) => {
    const segmented = segmentSingleGreekBlob(match);
    return segmented ?? match;
  });
  return out;
}

function segmentSingleGreekBlob(blob: string): string | null {
  if (blob.length < 5) return null;

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
  'της', 'του', 'των', 'την', 'τον',
  'με', 'σε', 'που', 'δεν', 'ότι', 'είναι', 'έχει', 'έχουν', 'ήταν', 'θα', 'όταν', 'εάν',
  'ώστε', 'όπως', 'πώς', 'τότε', 'όμως', 'αλλά', 'ενώ', 'άρα', 'επίσης', 'μόνο',
  'πολύ', 'ακόμα', 'ακόμη', 'κάθε', 'κάποιο', 'κάτι', 'αυτό', 'αυτή', 'αυτά', 'άλλο', 'άλλη', 'άλλα',
  'ένα', 'έναν', 'ένας', 'μία', 'μια', 'μετά', 'πριν', 'επί', 'κατά', 'υπό', 'προς', 'μεταξύ',
  'συνήθως', 'επομένως', 'συνεπώς', 'γενικά',
];

/** Longer stems used only for severely glued lines (min 4 chars). */
const GLUED_SEVERE_WORDS = [
  'συμπεριφορική', 'ορθολογικής', 'επιλογής', 'επιλογή', 'επιλογές', 'πραγματικά', 'οικονομικές',
  'παρούσα', 'αξία', 'κόστος', 'μήνες', 'μήνα', 'σήμερα', 'καταναλωτής', 'προσφορά', 'συνάρτηση',
  'περισσότερο', 'περισσότεροι', 'αποδίδει', 'δολάριο', 'δολάρι',
  'υπόσχεση', 'λαμβάνει', 'σαμπουάν', 'κομμωτήριο', 'πιθανότητα', 'φαινόμενα', 'καθαρισμό',
  'πουθαδοθεί', 'δοθεί', 'μπορεί', 'τρεις', 'απώλεια', 'ζωής', 'πλήρη', 'πληρώνατε',
];

const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/Δύοχώρες/giu, 'Δύο χώρες'],
  [/ΔΥΟΧΩΡΕΣ/giu, 'ΔΥΟ ΧΩΡΕΣ'],
  [/ηαλλοδαπή/giu, 'η αλλοδαπή'],
  [/διεθνέςεμπόριο/giu, 'διεθνές εμπόριο'],
  [/Διανομήεισοδήματος/giu, 'Διανομή εισοδήματος'],
  [/παραγωγήςεισοδήματος/giu, 'παραγωγής εισοδήματος'],
  [/Απόλυταπλεονεκτήματα/giu, 'Απόλυτα πλεονεκτήματα'],
  [/πιθανο\s+λογείται/giu, 'πιθανολογείται'],
  [/Κό\s+στο\s+ς/giu, 'Κόστος'],
  [/υφι\s+στα\s+μένων/giu, 'υφιστάμενων'],
  [/παρούσααξία/giu, 'παρούσα αξία'],
  [/δοθείμετά/giu, 'δοθεί μετά'],
  [/ορθολογικήςεπιλογής/giu, 'ορθολογικής επιλογής'],
  [/πραγματικάεπιλογές/giu, 'πραγματικά επιλογές'],
  [/οικονομικέςαποφάσεις/giu, 'οικονομικές αποφάσεις'],
  [/τηβάση/giu, 'τη βάση'],
  [/Θαπληρώνατε/giu, 'Θα πληρώνατε'],
  [/ενόςσούπερμάρκετ/giu, 'ενός σούπερ μάρκετ'],
  [/Η\s+η\s+με\s+δαπή/giu, 'Η ημεδαπή'],
  [/αποφά\s+σε\s+ις/giu, 'αποφάσεις'],
  [/Ηημεδαπή/giu, 'Η ημεδαπή'],
  [/σαμπουσεένα/giu, 'σαμπουάν σε ένα'],
  [/σαμπουανένα/giu, 'σαμπουάν σε ένα'],
  [/υπόσχεση/giu, 'υπόσχεση'],
  [/υπό\s+σχε/giu, 'υπόσχε'],
  [/λαμβάνεισήμερα/giu, 'λαμβάνει σήμερα'],
  [/λαμβάνεισή\s+με\s+ρα/giu, 'λαμβάνει σήμερα'],
  [/τρειςμήνες/giu, 'τρεις μήνες'],
  [/μπορείνα/giu, 'μπορεί να'],
  [/μπορ\s+είναι/giu, 'μπορεί να είναι'],
  [/δοθείως/giu, 'δοθεί ως'],
  [/δωθείως/giu, 'δοθεί ως'],
  [/ηπιθα\s+ενοτηταναχά\s+σε\s+τε/giu, 'η πιθανότητα να χάσετε'],
  [/ηπιθανότητανα/giu, 'η πιθανότητα να'],
  [/μεπιθα/giu, 'με πιθα'],
  [/απώλειακαμίας/giu, 'απώλεια καμίας'],
  [/ζωήςμε/giu, 'ζωής με'],
  [/μεπλήρη/giu, 'με πλήρη'],
  [/καταρισμό/giu, 'καθαρισμό'],
  [/πληρωνετη/giu, 'πληρώνετε τη'],
  [/χαμηλότερητιμή/giu, 'χαμηλότερη τιμή'],
  [/1πουθαδοθεί/giu, '1 που θα δοθεί'],
  [/πουθαδοθεί/giu, 'που θα δοθεί'],
  [/μετάαπόμήνες/giu, 'μετά από μήνες'],
  [/μηνες\s+ςε\s+ειναι/giu, 'μήνες είναι'],
  [/μετάαπόέναν/giu, 'μετά από έναν'],
  [/ένανμήνα/giu, 'έναν μήνα'],
  [/ένανενα/giu, 'έναν ένα'],
  [/σή\s+με\s+ρα/giu, 'σήμερα'],
  [/λαμβάνει\s+σή\s+με\s+ρα/giu, 'λαμβάνει σήμερα'],
  [/λαμβάνεισή\s+με\s+ρα/giu, 'λαμβάνει σήμερα'],
  [/θαπάρει/giu, 'θα πάρει'],
  [/μεπλήρηκαταρισμό/giu, 'με πλήρη καθαρισμό'],
  [/μεπλήρηκαθαρισμό/giu, 'με πλήρη καθαρισμό'],
  [/πληρη\s+θα\s+ρισμό/giu, 'πλήρη καθαρισμό'],
  [/ακριβόκομμωτήριο/giu, 'ακριβό κομμωτήριο'],
  [/σαμπουαν/giu, 'σαμπουάν'],
  [/αμ\s+που\s+άν/giu, 'σαμπουάν'],
  [/χά\s+σε\s+τε/giu, 'χάσετε'],
  [/να\s+χά\s+σε\s+τε/giu, 'να χάσετε'],
  [/σαμ\s+που\s+αν/giu, 'σαμπουάν'],
  [/μήνεςείναι/giu, 'μήνες είναι'],
  [/μηνες\s+ςε\s+ειναι/giu, 'μήνες είναι'],
  [/μηνες\s+ειναι/giu, 'μήνες είναι'],
  [/η\s+πι\s+θα\s+ενοτητα/giu, 'η πιθανότητα'],
  [/ηπιθα\s+ενοτηταναχά\s+σετε/giu, 'η πιθανότητα να χάσετε'],
  [/ηπιθα\s+ενοτηταναχά\s+σε\s+τε/giu, 'η πιθανότητα να χάσετε'],
  [/ενοτηταναχά/giu, 'πιθανότητα να χά'],
];

/** Greek tokens that must stay separate when split-repair runs. */
const INTRA_WORD_SPLIT_STOPWORDS = new Set([
  'και', 'για', 'στο', 'στη', 'στην', 'στον', 'στους', 'στις', 'στα', 'της', 'του', 'των',
  'από', 'με', 'σε', 'που', 'δεν', 'ότι', 'είναι', 'έχει', 'αυτό', 'αυτή', 'ήταν', 'όταν',
  'κάθε', 'τον', 'την', 'τας', 'μια', 'να', 'θα', 'αν', 'τις', 'δια', 'επί', 'υπό', 'το',
  'η', 'ο', 'οι', 'τα', 'τοι', 'τις', 'ως', 'αν', 'ενώ', 'αλλά', 'όπου', 'άρα', 'εάν',
]);

/** Merge OCR line-break splits inside Greek words (lecture PDFs). */
export function repairIntraWordGreekSplits(line: string): string {
  let out = line;
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(
      /([\p{Script=Greek}α-ώ]{2,}) ([α-ωά-ώ]{2,8})/giu,
      (match, left: string, right: string) => {
        const r = right.toLowerCase();
        const l = left.toLowerCase();
        if (left.length < 5) return match;
        if (isLexiconWord(left) || isLexiconWord(right)) return match;
        if (isLexiconWord(left + right)) return match;
        if (/\d$/.test(left)) return match;
        if (INTRA_WORD_SPLIT_STOPWORDS.has(r) || INTRA_WORD_SPLIT_STOPWORDS.has(l)) return match;
        if (right.length >= 7 && left.length >= 5) return match;
        return left + right;
      },
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Ordinal suffix glued by PDF extract: "2 ης" → "2ης". */
export function repairGreekOrdinalSpaces(line: string): string {
  return line.replace(/(\d+)\s+ης\b/giu, '$1ης');
}

/** Spaced Roman/Greek numeral letters in chapter refs: "V ΙΙΙ" → "VIII". */
export function repairSpacedRomanNumerals(line: string): string {
  let out = line.replace(/([IVXLC])(?:\s+[IVXLCΙΧ]){2,}/g, (m) => m.replace(/\s+/g, ''));
  out = out.replace(/Κεφάλαιο\s+XI\s+Ι\b/giu, 'Κεφάλαιο XII');
  return out;
}

/** Join hyphenated Greek words split across PDF lines: "σχεδι -" + "ασμένο". */
export function repairGreekHyphenationBreaks(text: string): string {
  return text.replace(
    /([\p{Script=Greek}α-ώ]{2,})\s*-\s*\n\s*([\p{Script=Greek}α-ώ]{2,})/giu,
    '$1$2',
  );
}

/** Math labels split by PDF line breaks: "ν - οστής" → "ν-οστής". */
function repairGreekMathLabelHyphens(line: string): string {
  return line.replace(/(ν)\s*-\s*(οστής)/giu, '$1-$2');
}

/** Insert missing spaces after punctuation before Greek (OCR glue). */
function repairPunctuationGlue(line: string): string {
  return line
    .replace(/(\d)([.)])(?=[\p{Script=Greek}])/gu, '$1$2 ')
    .replace(/([;:,])(?=[\p{Script=Greek}])/gu, '$1 ');
}

function particleInsideLexiconWord(whole: string, particleStart: number, particleEnd: number): boolean {
  let start = particleStart;
  while (start > 0 && /[\p{Script=Greek}]/u.test(whole[start - 1]!)) start -= 1;
  let end = particleEnd;
  while (end < whole.length && /[\p{Script=Greek}]/u.test(whole[end]!)) end += 1;
  const word = whole.slice(start, end);
  if (isLexiconWord(word)) return true;
  // Substring may be a glued blob — scan all lexicon hits overlapping the particle.
  for (let s = particleStart; s >= start; s -= 1) {
    for (let e = particleEnd; e <= end; e += 1) {
      const slice = whole.slice(s, e);
      if (slice.length >= 4 && isLexiconWord(slice)) return true;
    }
  }
  return false;
}

/** Merge OCR-broken Greek words split by stray spaces (σή με ρα → σήμερα). */
export function repairFragmentedGreekWords(line: string): string {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2) return line;

  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let merged: string | null = null;
    let take = 0;
    const maxWindow = Math.min(6, tokens.length - i);
    for (let w = maxWindow; w >= 2; w -= 1) {
      const slice = tokens.slice(i, i + w);
      if (slice.some((t) => /^\d+$/.test(t))) continue;
      const joined = slice.join('');
      if (!GREEK_SCRIPT.test(joined)) continue;
      if (isLexiconWord(joined)) {
        merged = joined;
        take = w;
        break;
      }
    }
    if (merged && take > 0) {
      out.push(merged);
      i += take;
    } else {
      out.push(tokens[i]!);
      i += 1;
    }
  }
  return out.join(' ');
}

/** Split common Greek particles when OCR merged adjacent words. */
function repairParticleGlue(line: string, extraWords: string[] = []): string {
  let out = line;
  const sorted = [...GLUED_PARTICLES, ...extraWords]
    .filter((w) => w.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const word of sorted) {
      const re = new RegExp(`(?<=[\\p{Script=Greek}\\d])(?<![\\s\\-])(${word})(?=[\\p{Script=Greek}])`, 'giu');
      const next = out.replace(re, (match, particle: string, offset: number, whole: string) => {
        const particleStart = offset;
        const particleEnd = offset + particle.length;
        if (particleInsideLexiconWord(whole, particleStart, particleEnd)) return match;
        return ` ${particle} `;
      });
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

/** Space between digits and adjacent Greek letters (1μετά → 1 μετά). */
function repairDigitGreekBoundaries(line: string): string {
  return line
    .replace(/(\d)([\p{Script=Greek}])/gu, '$1 $2')
    .replace(/([\p{Script=Greek}])(\d)/gu, '$1 $2');
}

/** Decode HTML entities leaked from PDF text layers. */
export function repairHtmlEntitiesInText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** $1 . 000 . 000 → $1.000.000 */
function repairCurrencySpacing(line: string): string {
  return line.replace(
    /\$(\d+)((?:\s*\.\s*\d{3})+)/g,
    (_, head: string, tail: string) => `$${head}${tail.replace(/\s*\.\s*/g, '.')}`,
  );
}

/** Lines with almost no whitespace need aggressive particle splitting. */
function greekGlueSeverity(line: string): number {
  const greek = (line.match(/[\p{Script=Greek}]/gu) ?? []).length;
  if (greek < 12) return 0;
  const spaces = (line.match(/\s/g) ?? []).length;
  return greek / Math.max(1, spaces + 1);
}

function repairSeverelyGluedGreekLine(line: string): string {
  if (greekGlueSeverity(line) < 6) return line;
  let s = line;
  s = repairDigitGreekBoundaries(s);
  s = s.replace(/([.!?:;,])(?=[\p{Script=Greek}\d])/gu, '$1 ');
  s = repairKnownPhrases(s);
  s = repairParticleGlue(s, GLUED_SEVERE_WORDS);
  s = segmentGluedGreekBlob(s);
  s = repairKnownPhrases(s);
  s = repairParticleGlue(s, GLUED_SEVERE_WORDS);
  return s;
}

/** Article Η glued to η-words (Ηημεδαπή → Η ημεδαπή). */
function repairArticleGlue(line: string): string {
  return line.replace(
    /(^|[^\p{L}])(Η)(η[α-ωά-ώ]{2,}?)(?=και|[Α-ΩΆ-Ώ]|[^\p{L}]|$)/giu,
    '$1$2 $3',
  );
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
    out = out.replace(new RegExp(re.source, re.flags), repl);
  }
  return out;
}

/** Light phrase + fragment pass after spell gate (spell gate can re-break Greek compounds). */
export function repairGreekPhraseCleanup(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (/ {3,}/.test(line)) return line;
      return repairKnownPhrases(repairFragmentedGreekWords(line));
    })
    .join('\n');
}

/** Repair OCR word glue on a single line (inverse of spaced-glyph corruption). */
export function repairGluedGreekLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (/ {3,}/.test(trimmed)) return line;
  let s = trimmed;
  s = repairHtmlEntitiesInText(s);
  s = repairCurrencySpacing(s);
  s = repairPunctuationGlue(s);
  s = repairKnownPhrases(s);
  s = repairArticleGlue(s);
  s = repairLeadingArticles(s);
  s = repairSeverelyGluedGreekLine(s);
  s = repairDigitGreekBoundaries(s);
  s = repairGreekOrdinalSpaces(s);
  s = repairParticleGlue(s);
  s = repairGreekCaseGlue(s);
  s = segmentGluedGreekBlob(s);
  s = repairGreekOrdinalSpaces(s);
  s = repairSpacedRomanNumerals(s);
  s = repairGreekMathLabelHyphens(s);
  s = repairFragmentedGreekWords(s);
  s = repairIntraWordGreekSplits(s);
  s = repairFragmentedGreekWords(s);
  s = segmentGluedGreekBlob(s);
  s = repairKnownPhrases(s);
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
  const normalized = repairHtmlEntitiesInText(text.replace(/\r\n/g, '\n'));
  const hyphenFixed = repairGreekHyphenationBreaks(normalized);
  let out = repairGluedGreekText(repairSpacedGreekText(hyphenFixed));
  out = out
    .split('\n')
    .map((line) => (/ {3,}/.test(line) ? line : repairKnownPhrases(repairFragmentedGreekWords(line))))
    .join('\n');
  return out;
}
