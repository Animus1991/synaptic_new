import type { Lang } from './i18n';
import type { MessageCitation, UserSettings } from '../types';
import { ragSynthesize } from './orgClient';
import { ragSourcesToCitations } from './ragSynthesisCitations';

export const MULTI_DOC_ACTION: Record<Lang, string> = {
  en: 'Synthesize across my library',
  el: 'Σύνθεση σε όλη τη βιβλιοθήκη',
};

export function isMultiDocSynthesizeAction(action: string, lang: Lang): boolean {
  return action.trim() === MULTI_DOC_ACTION[lang];
}

export type MultiDocSynthesizeResult = {
  synthesis: string;
  sourceCount: number;
  citations: MessageCitation[];
  indexedChunks: number;
};

export async function runMultiDocSynthesize(
  token: string,
  settings: UserSettings,
  query: string,
  lang: Lang,
  courseIds?: string[],
): Promise<MultiDocSynthesizeResult> {
  const result = await ragSynthesize(token, settings, query, { courseIds, lang });
  const sources = result.sources ?? [];
  return {
    synthesis: result.synthesis,
    sourceCount: sources.length,
    citations: ragSourcesToCitations(sources),
    indexedChunks: result.indexedChunks ?? 0,
  };
}
