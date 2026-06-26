/**
 * Wave 8B-β — Paragraph-level EL/EN script detection (no external CLD dependency).
 */

export type ParagraphLang = 'el' | 'en' | 'mixed';

const GREEK = /\p{Script=Greek}/u;
const LATIN = /[A-Za-z]/;

export function detectParagraphLang(paragraph: string): ParagraphLang {
  let greek = 0;
  let latin = 0;
  for (const ch of paragraph) {
    if (GREEK.test(ch)) greek += 1;
    else if (LATIN.test(ch)) latin += 1;
  }
  const total = greek + latin;
  if (total === 0) return 'mixed';
  const greekRatio = greek / total;
  if (greekRatio >= 0.65) return 'el';
  if (greekRatio <= 0.2) return 'en';
  return 'mixed';
}

export function detectDocumentPrimaryLang(text: string): ParagraphLang {
  const paras = text.split(/\n{2,}/).filter((p) => p.trim().length > 20);
  if (paras.length === 0) return detectParagraphLang(text);
  let el = 0;
  let en = 0;
  for (const p of paras) {
    const lang = detectParagraphLang(p);
    if (lang === 'el') el += 1;
    else if (lang === 'en') en += 1;
  }
  if (el > en * 1.5) return 'el';
  if (en > el * 1.5) return 'en';
  return 'mixed';
}
