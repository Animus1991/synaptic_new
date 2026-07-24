import { imageSize } from 'image-size';

/**
 * Accepts a raw base64 string or a data URL and returns a decoded Buffer plus
 * a normalized data URL usable as an OpenAI-compatible image_url input.
 */
export function decodeImagePayload(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  let mime = 'image/jpeg';
  let base64 = raw;

  const dataUrlMatch = raw.match(/^data:([^;,]+);base64,(.*)$/s);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1] || mime;
    base64 = dataUrlMatch[2] || '';
  }

  base64 = base64.replace(/\s+/g, '');
  if (!base64) return null;

  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
  if (buffer.length === 0) return null;

  return {
    buffer,
    mime,
    dataUrl: `data:${mime};base64,${base64}`,
  };
}

/**
 * Robustly determine pixel dimensions of an image buffer. Falls back to null
 * when the format cannot be parsed, so callers can degrade gracefully.
 */
export function readImageDimensions(buffer) {
  try {
    const { width, height } = imageSize(buffer);
    if (width && height) return { width, height };
  } catch {
    /* unsupported / corrupt header */
  }
  return null;
}
