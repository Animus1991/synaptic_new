/**
 * OPT-AI-D — model / base-URL presets for hybrid economics (proxy, Ollama, keyed APIs).
 */

export type AiModelTierId = 'economy' | 'balanced' | 'quality';

export type AiModelTierPreset = {
  id: AiModelTierId;
  model: string;
  /** Short EN label; UI localizes via settingsContent. */
  labelEn: string;
};

export type AiBaseUrlPresetId = 'openai' | 'ollama' | 'groq' | 'clear';

export type AiBaseUrlPreset = {
  id: AiBaseUrlPresetId;
  baseUrl: string;
  labelEn: string;
};

export const AI_MODEL_TIER_PRESETS: readonly AiModelTierPreset[] = [
  { id: 'economy', model: 'gpt-4o-mini', labelEn: 'Economy' },
  { id: 'balanced', model: 'gpt-4o-mini', labelEn: 'Balanced' },
  { id: 'quality', model: 'gpt-4o', labelEn: 'Quality' },
] as const;

export const AI_BASE_URL_PRESETS: readonly AiBaseUrlPreset[] = [
  { id: 'openai', baseUrl: 'https://api.openai.com/v1', labelEn: 'OpenAI' },
  { id: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', labelEn: 'Ollama (local)' },
  { id: 'groq', baseUrl: 'https://api.groq.com/openai/v1', labelEn: 'Groq' },
  { id: 'clear', baseUrl: '', labelEn: 'Clear (default)' },
] as const;

export function resolveModelTierPreset(id: AiModelTierId): AiModelTierPreset {
  return AI_MODEL_TIER_PRESETS.find((p) => p.id === id) ?? AI_MODEL_TIER_PRESETS[1]!;
}

export function resolveBaseUrlPreset(id: AiBaseUrlPresetId): AiBaseUrlPreset {
  return AI_BASE_URL_PRESETS.find((p) => p.id === id) ?? AI_BASE_URL_PRESETS[3]!;
}

/** Infer tier from current model string for UI highlight. */
export function inferModelTier(model: string | undefined): AiModelTierId {
  const m = (model ?? '').trim().toLowerCase();
  if (!m || m.includes('mini') || m.includes('haiku') || m.includes('8b')) return 'economy';
  if (m.includes('gpt-4o') && !m.includes('mini')) return 'quality';
  if (m.includes('gpt-4') || m.includes('opus') || m.includes('70b')) return 'quality';
  return 'balanced';
}
