import { config, visionAvailable } from './config.js';
import { decodeImagePayload } from './util/images.js';
import * as tesseract from './engines/tesseract.js';
import * as vision from './engines/visionLlm.js';

const PAGE_SEPARATOR = '\n\f\n';

/**
 * Decide which engine to use for a given request mode.
 * @returns {'vision'|'tesseract'}
 */
export function selectEngine(mode) {
  const hasVision = visionAvailable();
  if (mode === 'handwriting') return hasVision ? 'vision' : 'tesseract';
  if (mode === 'printed') return 'tesseract';
  // mode === 'auto' (default)
  if (hasVision && config.autoStrategy === 'vision-first') return 'vision';
  return 'tesseract';
}

/**
 * Run OCR over a batch of base64 page images and return a response shaped for
 * the Synapse client contract: { text, pageCount, ocrUsed, regions, modelsUsed }.
 *
 * @param {object} params
 * @param {string[]} params.pages    Base64 (or data URL) page images.
 * @param {number}   [params.pageCount]
 * @param {string}   [params.languages]  Tesseract language string, e.g. "eng+ell".
 * @param {'auto'|'handwriting'|'printed'} [params.mode]
 */
export async function runOcr({ pages, pageCount, languages, mode = 'auto' }) {
  const limited = pages.slice(0, config.maxPages);
  const langs = (languages || config.tesseractLangs).trim() || 'eng+ell';
  const normalizedMode = ['auto', 'handwriting', 'printed'].includes(mode) ? mode : 'auto';

  const requested = selectEngine(normalizedMode);

  const pageTexts = [];
  const regions = [];
  const modelsUsed = new Set();
  let effectiveEngine = requested;
  let visionFailed = false;

  for (let i = 0; i < limited.length; i++) {
    const image = decodeImagePayload(limited[i]);
    if (!image) {
      pageTexts.push('');
      continue;
    }

    let result = null;

    if (effectiveEngine === 'vision' && !visionFailed) {
      try {
        result = await vision.recognizeImage(image, { mode: normalizedMode });
        modelsUsed.add(`vision-llm:${config.vision.model}`);
        if (normalizedMode === 'handwriting') modelsUsed.add('vision-llm-handwriting');
      } catch (err) {
        // Degrade to Tesseract for this and all remaining pages.
        visionFailed = true;
        effectiveEngine = 'tesseract';
        modelsUsed.add('vision-fallback-error');
        console.warn(`[ocr] vision engine failed, falling back to tesseract: ${err.message}`);
      }
    }

    if (!result) {
      result = await tesseract.recognizeImage(image, { langs, pageIndex: i });
      modelsUsed.add(`tesseract:${langs}`);
      if (normalizedMode === 'handwriting') modelsUsed.add('tesseract-handwriting-fallback');
    }

    pageTexts.push(result.text ?? '');
    for (const r of result.regions ?? []) regions.push({ ...r, pageIndex: i });
  }

  const text = pageTexts.join(PAGE_SEPARATOR).trim();

  return {
    text,
    pageCount: pageCount ?? limited.length,
    ocrUsed: true,
    regions,
    modelsUsed: [...modelsUsed],
    engine: effectiveEngine,
  };
}
