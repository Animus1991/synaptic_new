import { config } from '../config.js';

/**
 * High-quality OCR via an OpenAI-compatible vision chat endpoint.
 * This is the recommended path for Greek — both printed and handwritten —
 * because modern vision LLMs vastly outperform classical OCR on cursive,
 * accented, and low-quality scans.
 */

const SYSTEM_PROMPT = [
  'You are a meticulous OCR transcription engine.',
  'Transcribe ALL text in the image EXACTLY as it appears.',
  'Rules:',
  '- Preserve the original language. Greek must stay Greek; do NOT translate or transliterate.',
  '- Keep all Greek diacritics/accents (τόνοι, διαλυτικά) and punctuation.',
  '- Preserve line breaks and reading order (top-to-bottom, left-to-right).',
  '- Do NOT add explanations, labels, markdown, or commentary.',
  '- If a word is unclear, provide your single best reading (no brackets, no notes).',
  '- Output ONLY the transcribed text.',
].join('\n');

function userPrompt(mode) {
  if (mode === 'handwriting') {
    return 'This page contains handwritten text. Carefully transcribe the handwriting, preserving the original language and accents.';
  }
  return 'Transcribe every piece of text on this page.';
}

/**
 * Recognize a single decoded image via the configured vision model.
 * @returns {{ text: string, regions: object[], confidence: number }}
 */
export async function recognizeImage(image, { mode }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.vision.timeoutMs);

  const headers = { 'Content-Type': 'application/json' };
  if (config.vision.apiKey) headers.Authorization = `Bearer ${config.vision.apiKey}`;

  const body = {
    model: config.vision.model,
    temperature: config.vision.temperature,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt(mode) },
          { type: 'image_url', image_url: { url: image.dataUrl } },
        ],
      },
    ],
  };

  let res;
  try {
    res = await fetch(`${config.vision.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`vision endpoint ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();

  // Vision models do not return word-level geometry, so no overlay regions.
  return { text, regions: [], confidence: text ? 0.9 : 0 };
}
