/**
 * Wave 8B-β — Unicode hygiene: NFKC normalization, PUA / control / decorative symbol stripping.
 */

/** Private Use Area + common OCR noise symbols (Wingdings-like, bullets misread as icons). */
const PUA_OR_ICON = /[\uE000-\uF8FF\uFFF0-\uFFFF]/gu;

/** Control chars except tab, newline, carriage-return, and form-feed (page breaks). */
const CONTROL_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F]/g;

/** Decorative dingbats often leaked from PDF symbol fonts. */
const DECORATIVE_SYMBOLS = /[\u2600-\u26FF\u2700-\u27BF]/gu;

export type SanitizeUnicodeReport = {
  puaStripped: number;
  controlStripped: number;
  decorativeStripped: number;
  replacementChars: number;
};

function countMatches(text: string, pattern: RegExp): number {
  const re = new RegExp(pattern.source, pattern.flags);
  let n = 0;
  while (re.exec(text)) n += 1;
  return n;
}

/** NFKC normalize and strip non-text Unicode noise while preserving math/table punctuation. */
export function sanitizeUnicode(text: string): { text: string; report: SanitizeUnicodeReport } {
  if (!text) {
    return {
      text: '',
      report: { puaStripped: 0, controlStripped: 0, decorativeStripped: 0, replacementChars: 0 },
    };
  }

  const replacementChars = (text.match(/\uFFFD/g) ?? []).length;
  let out = text.normalize('NFKC');

  const puaStripped = countMatches(out, PUA_OR_ICON);
  out = out.replace(PUA_OR_ICON, '');

  const controlStripped = countMatches(out, CONTROL_EXCEPT_WHITESPACE);
  out = out.replace(CONTROL_EXCEPT_WHITESPACE, '');

  const decorativeStripped = countMatches(out, DECORATIVE_SYMBOLS);
  out = out.replace(DECORATIVE_SYMBOLS, '');

  out = out.replace(/\uFFFD/g, '');

  return {
    text: out,
    report: { puaStripped, controlStripped, decorativeStripped, replacementChars },
  };
}
