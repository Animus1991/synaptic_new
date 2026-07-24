/**
 * OPT-AI-C — draft NL ask prompt from Analytics insights payload.
 */

import type { Lang } from './i18n';

/** Minimal shape so lib does not import UI components. */
export type InsightsAskInput = {
  observations: string[];
  actions: { concept?: string }[];
};

export function buildInsightsAskPrompt(
  payload: InsightsAskInput,
  lang: Lang,
): string {
  const obs = payload.observations.slice(0, 3).filter(Boolean);
  const weak = payload.actions
    .map((a) => a.concept)
    .filter((c): c is string => Boolean(c?.trim()))
    .slice(0, 3);
  if (lang === 'el') {
    const parts = [
      'Με βάση τα analytics insights μου,',
      obs.length ? `παρατηρήσεις: ${obs.join(' · ')}.` : '',
      weak.length ? `Αδύναμα: ${weak.join(', ')}.` : '',
      'Τι πρέπει να μελετήσω στη συνέχεια;',
    ].filter(Boolean);
    return parts.join(' ');
  }
  const parts = [
    'Based on my analytics insights,',
    obs.length ? `observations: ${obs.join(' · ')}.` : '',
    weak.length ? `Weak areas: ${weak.join(', ')}.` : '',
    'What should I study next?',
  ].filter(Boolean);
  return parts.join(' ');
}
