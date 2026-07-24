import { config } from '../config';

const DEFAULT_ALLOWED = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4.1-nano',
  'o4-mini',
  'text-embedding-3-small',
  'text-embedding-3-large',
];

/** Models permitted through the managed proxy (comma-separated LLM_ALLOWED_MODELS). */
export function getAllowedModels(): Set<string> {
  const raw = config.llmAllowedModels;
  const list = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED;
  return new Set(list);
}

export function assertModelAllowed(model: unknown): string | null {
  if (typeof model !== 'string' || !model.trim()) {
    return 'model is required';
  }
  const allowed = getAllowedModels();
  if (!allowed.has(model.trim())) {
    return `model "${model}" is not in the allowlist`;
  }
  return null;
}
