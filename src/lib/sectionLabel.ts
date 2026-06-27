/** Human-readable section fallback — never use legal § in UI. */
export function formatSectionFallbackLabel(index: number, lang: 'en' | 'el' = 'en'): string {
  const n = index + 1;
  return lang === 'el' ? `Ενότητα ${n}` : `Section ${n}`;
}
