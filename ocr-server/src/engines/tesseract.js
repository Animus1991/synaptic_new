import { createWorker } from 'tesseract.js';
import { readImageDimensions } from '../util/images.js';

/**
 * Offline OCR baseline using Tesseract.js. Language data is downloaded and
 * cached on first use. Workers are pooled per language string to avoid the
 * (expensive) re-initialization cost between requests.
 */

const workerPool = new Map(); // langs -> Promise<Worker>

function getWorker(langs) {
  if (!workerPool.has(langs)) {
    workerPool.set(
      langs,
      createWorker(langs).catch((err) => {
        workerPool.delete(langs);
        throw err;
      }),
    );
  }
  return workerPool.get(langs);
}

/** Clamp a value into the inclusive [0, 100] percentage range. */
function pct(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Recognize a single decoded image.
 * @returns {{ text: string, regions: object[], confidence: number }}
 */
export async function recognizeImage(image, { langs, pageIndex }) {
  const worker = await getWorker(langs);
  const { data } = await worker.recognize(image.buffer, {}, { text: true, blocks: true });

  const dims = readImageDimensions(image.buffer);
  const words = Array.isArray(data.words) ? data.words : [];

  // Derive page dimensions: prefer real header dims, fall back to bbox extents.
  let pageW = dims?.width ?? 0;
  let pageH = dims?.height ?? 0;
  if (!pageW || !pageH) {
    for (const w of words) {
      if (w?.bbox) {
        pageW = Math.max(pageW, w.bbox.x1 ?? 0);
        pageH = Math.max(pageH, w.bbox.y1 ?? 0);
      }
    }
  }

  const regions = [];
  if (pageW > 0 && pageH > 0) {
    for (const w of words) {
      const text = (w?.text ?? '').trim();
      if (!text || !w?.bbox) continue;
      const { x0, y0, x1, y1 } = w.bbox;
      regions.push({
        text,
        left: pct((x0 / pageW) * 100),
        top: pct((y0 / pageH) * 100),
        width: pct(((x1 - x0) / pageW) * 100),
        height: pct(((y1 - y0) / pageH) * 100),
        confidence: Math.min(1, Math.max(0, (w.confidence ?? 0) / 100)),
        pageIndex,
      });
    }
  }

  return {
    text: (data.text ?? '').trim(),
    regions,
    confidence: Math.min(1, Math.max(0, (data.confidence ?? 0) / 100)),
  };
}

/** Gracefully terminate all pooled workers (used on shutdown). */
export async function shutdownTesseract() {
  const workers = await Promise.allSettled([...workerPool.values()]);
  workerPool.clear();
  await Promise.allSettled(
    workers.map((w) => (w.status === 'fulfilled' ? w.value.terminate() : Promise.resolve())),
  );
}
