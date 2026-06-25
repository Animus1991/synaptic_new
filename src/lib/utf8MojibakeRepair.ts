/**
 * Repairs UTF-8 text that was mis-decoded as Latin-1 / Windows-1252 (mojibake).
 * Common in PDF extraction, demo seeds, and files saved with wrong encoding.
 *
 * Algorithm (standard, no external deps):
 * 1. Latin-1 byte reinterpretation → UTF-8 decode
 * 2. legacy escape/unescape path for double-encoded strings
 * 3. Known frequent punctuation replacements
 */

const MOJIBAKE_MARKERS = /έΑ|╬|┬|Ã|Î|â|ï|ð|Ý|Þ|æ|Æ|Ç|þ|ÿ|Ÿ|Œ|œ|€|™|…(?=[a-zA-Z])|â€/;

const PUNCTUATION_FIXES: [RegExp, string][] = [
  [/έΑΦ/g, '—'],
  [/έΑΜ/g, '–'],
  [/έΑο/g, '…'],
  [/â€"/g, '—'],
  [/â€"/g, '–'],
  [/â€¦/g, '…'],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€\u009d/g, '"'],
  [/┬╖/g, '·'],
  [/ΓÇÖ/g, "'"],
  [/ΓÇ£/g, '"'],
  [/ΓÇ¥/g, '"'],
  [/ΓÇô/g, '–'],
  [/ΓÇö/g, '—'],
  [/ΓÇª/g, '…'],
];

function latin1BytesToUtf8(text: string): string | null {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!decoded || decoded.includes('\uFFFD') || decoded === text) return null;
  return decoded;
}

function legacyLatin1Unescape(text: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const decoded = decodeURIComponent(escape(text));
    if (decoded === text) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Returns true when text likely contains recoverable mojibake. */
export function looksLikeUtf8Mojibake(text: string): boolean {
  if (!text) return false;
  return MOJIBAKE_MARKERS.test(text);
}

/** Repair mojibake; idempotent on clean UTF-8. */
export function repairUtf8Mojibake(text: string, depth = 0): string {
  if (!text || depth > 3) return text;

  let out = text;
  for (const [pattern, replacement] of PUNCTUATION_FIXES) {
    out = out.replace(pattern, replacement);
  }

  if (!looksLikeUtf8Mojibake(out)) return out;

  const viaLatin1 = latin1BytesToUtf8(out);
  if (viaLatin1) return repairUtf8Mojibake(viaLatin1, depth + 1);

  const viaEscape = legacyLatin1Unescape(out);
  if (viaEscape) return repairUtf8Mojibake(viaEscape, depth + 1);

  return out;
}

/** Reader-safe display text: mojibake repair + Greek OCR repair hook point. */
export function repairDisplayText(text: string): string {
  return repairUtf8Mojibake(text);
}
