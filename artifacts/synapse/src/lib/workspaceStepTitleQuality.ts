/**
 * Filters OCR-noise and formula fragments from lesson-rail step titles.
 * Low-quality PPTX/PDF extraction often yields titles like "+10+OK+20+QY1800".
 */

const GARBAGE_PATTERNS = [
  /\+{2,}/,
  /\bQY\d+/i,
  /^[\d+\-*/=\\:;.,\sQYWy]+$/i,
  /^w\/w\*?\s*\d/i,
  /^\(\s*α\s*[A-Za-z*]+\s*\)/i,
];

/** True when a candidate step title is likely OCR/formula noise, not a human label. */
export function isGarbageStepTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 3) return true;
  if (GARBAGE_PATTERNS.some((re) => re.test(t))) return true;

  const letters = (t.match(/[\p{L}]/gu) ?? []).length;
  const ratio = letters / t.length;
  if (t.length <= 24 && ratio < 0.35) return true;
  if (t.length <= 12 && ratio < 0.5) return true;

  const plusCount = (t.match(/\+/g) ?? []).length;
  if (plusCount >= 2 && letters < 8) return true;

  return false;
}

/**
 * Collapse immediately-repeated word blocks produced by OCR/PDF extraction,
 * e.g. "Αγαθά Αναγκαία ποσότητα Αναγκαία ποσότητα" -> "Αγαθά Αναγκαία ποσότητα",
 * or a fully duplicated title "Introduction Introduction" -> "Introduction".
 * Comparison is case-insensitive; the first (original-cased) occurrence is kept.
 */
export function collapseRepeatedPhrases(input: string): string {
  let words = input.split(/\s+/).filter(Boolean);
  let changed = true;
  while (changed && words.length > 1) {
    changed = false;
    const n = words.length;
    for (let len = Math.floor(n / 2); len >= 1; len--) {
      let isDuplicateTail = true;
      for (let i = 0; i < len; i++) {
        if (words[n - 2 * len + i]!.toLowerCase() !== words[n - len + i]!.toLowerCase()) {
          isDuplicateTail = false;
          break;
        }
      }
      if (isDuplicateTail) {
        words = words.slice(0, n - len);
        changed = true;
        break;
      }
    }
  }
  return words.join(' ');
}

/** Pick the first non-garbage title or fall back to concept label. */
export function sanitizeStepTitle(title: string, concept: string, lang: 'en' | 'el'): string {
  const trimmed = collapseRepeatedPhrases(title.trim());
  if (!isGarbageStepTitle(trimmed)) return trimmed.slice(0, 42);
  const fallback = collapseRepeatedPhrases(concept.trim()) || (lang === 'el' ? 'Ενότητα' : 'Section');
  return fallback.slice(0, 42);
}
