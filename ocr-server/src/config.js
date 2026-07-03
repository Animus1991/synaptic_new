import 'dotenv/config';

function bool(value, fallback = false) {
  if (value == null) return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function int(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function float(value, fallback) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Centralized, validated runtime configuration for the OCR server. */
export const config = {
  port: int(process.env.PORT, 8787),
  corsOrigin: (process.env.CORS_ORIGIN ?? '*').trim(),
  authToken: (process.env.OCR_AUTH_TOKEN ?? '').trim(),
  maxPages: Math.max(1, int(process.env.OCR_MAX_PAGES, 15)),
  tesseractLangs: (process.env.OCR_TESSERACT_LANGS ?? 'eng+ell').trim(),
  autoStrategy: (process.env.OCR_AUTO_STRATEGY ?? 'vision-first').trim(),
  vision: {
    enabled: bool(process.env.OCR_VISION_ENABLED, false),
    baseUrl: (process.env.OCR_VISION_BASE_URL ?? 'https://api.openai.com/v1').trim().replace(/\/$/, ''),
    apiKey: (process.env.OCR_VISION_API_KEY ?? '').trim(),
    model: (process.env.OCR_VISION_MODEL ?? 'gpt-4o-mini').trim(),
    temperature: float(process.env.OCR_VISION_TEMPERATURE, 0),
    timeoutMs: int(process.env.OCR_VISION_TIMEOUT_MS, 120000),
  },
};

/** True when the vision engine is enabled and has the minimum config to run. */
export function visionAvailable() {
  if (!config.vision.enabled) return false;
  if (!config.vision.baseUrl) return false;
  // Local servers (e.g. Ollama) do not require an API key; remote ones do.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(config.vision.baseUrl);
  return isLocal || config.vision.apiKey.length > 0;
}
