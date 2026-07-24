import { t, type Lang } from './i18n';

/** Human-readable section fallback — never use legal § in UI. */
export function formatSectionFallbackLabel(index: number, lang: Lang = 'en'): string {
  const n = index + 1;
  return t('wsSectionNumbered', lang).replace('{n}', String(n));
}
