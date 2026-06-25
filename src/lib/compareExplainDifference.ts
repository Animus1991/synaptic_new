import type { Lang } from './i18n';

export function buildCompareDifferencePrompt(
  rowText: string,
  concept: string,
  lang: Lang,
): string {
  const excerpt = rowText.trim().slice(0, 500);
  if (lang === 'el') {
    return `Εξήγησε τη διαφορά μεταξύ των όρων σε αυτή τη σειρά σύγκρισης (έννοια: ${concept}), με βάση τις σημειώσεις μου:\n\n${excerpt}`;
  }
  return `Explain the difference between the terms in this comparison row (concept: ${concept}) using my notes:\n\n${excerpt}`;
}
