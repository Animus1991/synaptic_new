/**
 * Greek all-caps typography — accents (τόνοι) must not appear when every letter is capital.
 * CSS `text-transform: uppercase` keeps tonos; strip combining marks before display.
 */

/** Remove combining diacritics (tonos, dialytika, etc.) via NFD. */
export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/**
 * Format a label shown in all caps.
 * Strips τόνοι then uppercases — CSS `text-transform: uppercase` alone keeps Greek tonos.
 */
export function asAllCapsLabel(text: string): string {
  return stripDiacritics(text).toLocaleUpperCase('el-GR');
}
