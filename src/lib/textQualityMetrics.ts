/**
 * Wave 8B-β — Text hygiene quality metrics for course diagnostics and OCR gate.
 */

import { detectDocumentPrimaryLang } from './paragraphLangDetect';
import { isKnownWord } from './spellLexicon';
import { sanitizeUnicode } from './textSanitizer';

const GREEK = /\p{Script=Greek}/u;
const LATIN = /[A-Za-z]/;

export type TextHygieneReport = {
  /** 0–100; higher = cleaner text. */
  hygieneScore: number;
  /** 0–100; higher = more corruption detected. */
  corruptionScore: number;
  spacedGlyphRatio: number;
  gluedTokenRatio: number;
  unknownWordRatio: number;
  puaOrIconRatio: number;
  primaryLang: 'el' | 'en' | 'mixed';
  flags: string[];
};

function tokenizeWords(text: string): string[] {
  return text.match(/[\p{L}][\p{L}\p{N}'’-]*/gu) ?? [];
}

export function analyzeTextHygiene(rawText: string): TextHygieneReport {
  const { text, report: san } = sanitizeUnicode(rawText);
  const tokens = text.split(/\s+/).filter(Boolean);
  const words = tokenizeWords(text);

  const spacedGlyphs = tokens.filter((t) =>
    t.length <= 2 && [...t].every((c) => GREEK.test(c) || LATIN.test(c)),
  ).length;
  const spacedGlyphRatio = tokens.length ? spacedGlyphs / tokens.length : 0;

  const glued = words.filter((w) => w.length >= 14 && GREEK.test(w)).length;
  const gluedTokenRatio = words.length ? glued / words.length : 0;

  const lang = detectDocumentPrimaryLang(text);
  let unknown = 0;
  let checked = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    checked += 1;
    if (!isKnownWord(w, lang)) unknown += 1;
  }
  const unknownWordRatio = checked ? unknown / checked : 0;

  const chars = text.length || 1;
  const puaOrIconRatio = (san.puaStripped + san.decorativeStripped + san.replacementChars) / chars;

  const flags: string[] = [];
  if (spacedGlyphRatio > 0.2) flags.push('spaced-glyphs');
  if (gluedTokenRatio > 0.08) flags.push('glued-words');
  if (unknownWordRatio > 0.45) flags.push('unknown-tokens');
  if (puaOrIconRatio > 0.002) flags.push('pua-or-icons');
  if (san.replacementChars > 0) flags.push('replacement-chars');

  const corruptionScore = Math.round(
    Math.min(100,
      spacedGlyphRatio * 120
      + gluedTokenRatio * 80
      + unknownWordRatio * 60
      + puaOrIconRatio * 4000
      + (san.replacementChars > 0 ? 15 : 0),
    ),
  );

  const hygieneScore = Math.max(0, Math.min(100, 100 - corruptionScore));

  return {
    hygieneScore,
    corruptionScore,
    spacedGlyphRatio,
    gluedTokenRatio,
    unknownWordRatio,
    puaOrIconRatio,
    primaryLang: lang,
    flags,
  };
}

/** True when text layer looks corrupted enough to prefer OCR over sparse extract. */
export function textLayerLooksCorrupted(text: string): boolean {
  const h = analyzeTextHygiene(text);
  return h.corruptionScore >= 38
    || h.spacedGlyphRatio >= 0.22
    || h.flags.includes('replacement-chars');
}
