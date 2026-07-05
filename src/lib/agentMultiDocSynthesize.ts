import type { Lang } from './i18n';
import type { UserSettings } from '../types';
import { ragSynthesize } from './orgClient';

export const MULTI_DOC_ACTION: Record<Lang, string> = {
  en: 'Synthesize across my library',
  el: 'Σύνθεση σε όλη τη βιβλιοθήκη',
};

export function isMultiDocSynthesizeAction(action: string, lang: Lang): boolean {
  return action.trim() === MULTI_DOC_ACTION[lang];
}

export async function runMultiDocSynthesize(
  token: string,
  settings: UserSettings,
  query: string,
  lang: Lang,
  courseIds?: string[],
): Promise<{ synthesis: string; sourceCount: number }> {
  const result = await ragSynthesize(token, settings, query, { courseIds, lang });
  const sourceCount = Array.isArray(result.sources) ? result.sources.length : 0;
  return { synthesis: result.synthesis, sourceCount };
}
