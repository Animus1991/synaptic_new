/**
 * Wave 8B-β — Flatten PDF/HTML presentation metadata to plain study text.
 * Removes font-family spans, italic/bold markup, and meaningless icon glyphs in text runs.
 */

const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const STYLE_ATTR = /\sstyle\s*=\s*("[^"]*"|'[^']*')/gi;
const FONT_FAMILY = /font-family\s*:[^;"']+;?/gi;

/** Strip inline HTML and font styling; preserve textual content only. */
export function stripPresentationMarkup(text: string): string {
  if (!text || !/[<>&]/.test(text)) return text;

  let out = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  out = out.replace(STYLE_ATTR, '').replace(FONT_FAMILY, '');
  out = out.replace(/<\/?(em|i|b|strong|span|font|u|sub|sup|small|big)\b[^>]*>/gi, '');
  out = out.replace(HTML_TAG, '');

  return out.replace(/[ \t]{2,}/g, ' ');
}

/** Reader display pass: presentation + collapse accidental italic unicode (mathematical alphanumeric). */
export function flattenReaderPresentation(text: string): string {
  const flat = stripPresentationMarkup(text);
  return flat.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x1D434 && cp <= 0x1D467) return String.fromCharCode(65 + (cp - 0x1D434));
    if (cp >= 0x1D468 && cp <= 0x1D49B) return String.fromCharCode(97 + (cp - 0x1D468));
    return ch;
  });
}
