/**
 * OPT-AI-D — model / base-URL presets for hybrid economics (proxy, Ollama, keyed APIs).
 * Includes Sophea-Titan-1 (Greek local / vLLM OpenAI-compatible).
 */

export type AiModelTierId = 'economy' | 'balanced' | 'quality';

export type AiModelTierPreset = {
  id: AiModelTierId;
  model: string;
  /** Short EN label; UI localizes via settingsContent. */
  labelEn: string;
};

export type AiBaseUrlPresetId = 'openai' | 'ollama' | 'krikri' | 'sophea' | 'groq' | 'clear';

export type AiBaseUrlPreset = {
  id: AiBaseUrlPresetId;
  baseUrl: string;
  labelEn: string;
  /** When set, applying the preset also updates llmModel. */
  defaultModel?: string;
  /**
   * When true, chat requests send chat_template_kwargs.enable_thinking=false
   * (required for Sophea-Titan-1 Greek quality).
   */
  disableThinking?: boolean;
};

/** Default served-model-name from KIEFER vLLM examples. */
export const SOPHEA_TITAN_MODEL = 'sophea-titan-1';
/** Default local vLLM OpenAI-compatible base. */
export const SOPHEA_LOCAL_BASE_URL = 'http://127.0.0.1:8000/v1';
/**
 * ILSP Llama-Krikri-8B Instruct (Q4) via local Ollama tag with num_ctx=2048.
 * Upstream `:q4_k_m` defaults to 128k context and needs ~20GB RAM; `krikri-el` fits ~16GB.
 * Create once: `ollama create krikri-el -f Modelfile` (FROM …:q4_k_m + PARAMETER num_ctx 2048).
 */
export const KRIKRI_OLLAMA_MODEL = 'krikri-el';
export const OLLAMA_LOCAL_BASE_URL = 'http://127.0.0.1:11434/v1';

export const AI_MODEL_TIER_PRESETS: readonly AiModelTierPreset[] = [
  { id: 'economy', model: 'gpt-4o-mini', labelEn: 'Economy' },
  { id: 'balanced', model: 'gpt-4o-mini', labelEn: 'Balanced' },
  { id: 'quality', model: 'gpt-4o', labelEn: 'Quality' },
] as const;

export const AI_BASE_URL_PRESETS: readonly AiBaseUrlPreset[] = [
  { id: 'openai', baseUrl: 'https://api.openai.com/v1', labelEn: 'OpenAI', disableThinking: false },
  {
    id: 'ollama',
    baseUrl: OLLAMA_LOCAL_BASE_URL,
    labelEn: 'Ollama (local)',
    defaultModel: 'llama3.2',
  },
  {
    id: 'krikri',
    baseUrl: OLLAMA_LOCAL_BASE_URL,
    labelEn: 'Krikri / Greek Ollama',
    defaultModel: KRIKRI_OLLAMA_MODEL,
    disableThinking: false,
  },
  {
    id: 'sophea',
    baseUrl: SOPHEA_LOCAL_BASE_URL,
    labelEn: 'Sophea / Greek local',
    defaultModel: SOPHEA_TITAN_MODEL,
    disableThinking: true,
  },
  { id: 'groq', baseUrl: 'https://api.groq.com/openai/v1', labelEn: 'Groq', disableThinking: false },
  { id: 'clear', baseUrl: '', labelEn: 'Clear (default)', disableThinking: false },
] as const;

export function resolveModelTierPreset(id: AiModelTierId): AiModelTierPreset {
  return AI_MODEL_TIER_PRESETS.find((p) => p.id === id) ?? AI_MODEL_TIER_PRESETS[1]!;
}

export function resolveBaseUrlPreset(id: AiBaseUrlPresetId): AiBaseUrlPreset {
  return AI_BASE_URL_PRESETS.find((p) => p.id === id)
    ?? AI_BASE_URL_PRESETS.find((p) => p.id === 'clear')!
    ?? AI_BASE_URL_PRESETS[0]!;
}

/** Settings patch when the user clicks a base-URL preset chip. */
export function settingsPatchForBaseUrlPreset(
  id: AiBaseUrlPresetId,
): {
  llmBaseUrl: string | undefined;
  llmModel?: string;
  llmDisableThinking?: boolean;
} {
  const preset = resolveBaseUrlPreset(id);
  return {
    llmBaseUrl: preset.baseUrl || undefined,
    ...(preset.defaultModel ? { llmModel: preset.defaultModel } : {}),
    ...(preset.disableThinking !== undefined
      ? { llmDisableThinking: preset.disableThinking }
      : {}),
  };
}

/** Infer tier from current model string for UI highlight. */
export function inferModelTier(model: string | undefined): AiModelTierId {
  const m = (model ?? '').trim().toLowerCase();
  // Greek local specialists before generic size heuristics (…-8b… would otherwise map to economy).
  if (m.includes('sophea') || m.includes('titan') || m.includes('krikri')) return 'quality';
  if (!m || m.includes('mini') || m.includes('haiku') || m.includes('8b')) return 'economy';
  if (m.includes('gpt-4o') && !m.includes('mini')) return 'quality';
  if (m.includes('gpt-4') || m.includes('opus') || m.includes('70b') || m.includes('27b')) return 'quality';
  return 'balanced';
}
