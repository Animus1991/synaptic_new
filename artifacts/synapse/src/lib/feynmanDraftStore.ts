import { loadJson, saveJson } from './persistence';

const FEYNMAN_DRAFT_KEY = 'feynman-drafts';

export function loadFeynmanDraft(scope: string): string {
  return loadJson<Record<string, string>>(FEYNMAN_DRAFT_KEY, {})[scope] ?? '';
}

export function saveFeynmanDraft(scope: string, draft: string): void {
  const store = loadJson<Record<string, string>>(FEYNMAN_DRAFT_KEY, {});
  if (draft.trim()) store[scope] = draft;
  else delete store[scope];
  saveJson(FEYNMAN_DRAFT_KEY, store);
}
