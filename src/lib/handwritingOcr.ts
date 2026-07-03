/**
 * Client-side handwriting recognition for the document ingestion pipeline.
 *
 * Tesseract (bilingualOcrEnsemble) handles PRINTED Greek/Latin text well but is
 * weak on cursive / handwritten pages. This module adds a transformers.js TrOCR
 * pass (a transformer seq2seq model trained on handwriting) as an additional
 * recognition candidate, following the same lazy-import + runtime-guard + graceful
 * null pattern as `localEmbedder.ts`. The bilingual ensemble scoring then picks
 * the best candidate, so adding TrOCR never degrades a clean printed result.
 *
 * The model is English-centric; for predominantly Greek pages the heuristic gate
 * declines TrOCR so we do not waste compute on a script the model cannot read.
 */

/** Handwriting TrOCR model (quantized, browser-friendly). */
export const HANDWRITING_OCR_MODEL = 'Xenova/trocr-small-handwritten';

/** Mean Tesseract confidence (0-100) at or below which handwriting is suspected. */
export const HANDWRITING_CONFIDENCE_THRESHOLD = 62;

/** Below this share of Greek letters the page is Latin-dominant (TrOCR-eligible). */
const MAX_GREEK_SHARE_FOR_TROCR = 0.35;

const GREEK = /\p{Script=Greek}/u;
const LATIN = /[A-Za-z]/;

export type HandwritingImageSource = HTMLCanvasElement | File | Blob | string;

interface ImageToTextPipeline {
  (image: string): Promise<Array<{ generated_text?: string }>>;
}

/** True when transformers.js can run (browser main thread or dedicated worker). */
export function isHandwritingRuntime(): boolean {
  if (typeof globalThis === 'undefined') return false;
  return (
    typeof window !== 'undefined'
    || typeof (globalThis as { importScripts?: unknown }).importScripts === 'function'
  );
}

/**
 * Fraction of alphabetic characters that are Greek. Used to decline TrOCR on
 * Greek-dominant pages the English handwriting model cannot transcribe.
 */
export function greekLetterShare(text: string): number {
  let greek = 0;
  let latin = 0;
  for (const ch of text) {
    if (GREEK.test(ch)) greek += 1;
    else if (LATIN.test(ch)) latin += 1;
  }
  const letters = greek + latin;
  if (letters === 0) return 0;
  return greek / letters;
}

/**
 * Decide whether a handwriting OCR pass is worthwhile for a page.
 *
 * Triggers when the printed-OCR confidence is low (or empty) AND the page is not
 * Greek-dominant. Conservative by design: a confident printed result skips TrOCR.
 */
export function shouldAttemptHandwritingOcr(
  printedText: string,
  meanConfidence: number | null,
): boolean {
  const sample = printedText.trim();
  // Near-empty printed output → likely handwritten / hard scan; attempt.
  const sparse = sample.replace(/\s+/g, '').length < 12;
  const lowConfidence =
    meanConfidence !== null && meanConfidence <= HANDWRITING_CONFIDENCE_THRESHOLD;
  if (!sparse && !lowConfidence) return false;
  if (greekLetterShare(sample) > MAX_GREEK_SHARE_FOR_TROCR) return false;
  return true;
}

let pipelinePromise: Promise<ImageToTextPipeline | null> | null = null;

async function loadPipeline(): Promise<ImageToTextPipeline | null> {
  if (!isHandwritingRuntime()) return null;
  try {
    const { pipeline } = await import('@huggingface/transformers');
    return (await pipeline('image-to-text', HANDWRITING_OCR_MODEL, {
      dtype: 'q8',
    })) as unknown as ImageToTextPipeline;
  } catch (err) {
    console.warn('[handwritingOcr] failed to load model:', (err as Error).message);
    return null;
  }
}

function getPipeline(): Promise<ImageToTextPipeline | null> {
  if (!pipelinePromise) pipelinePromise = loadPipeline();
  return pipelinePromise;
}

/** Eagerly load the handwriting model (optional preload from app boot). */
export async function preloadHandwritingOcr(): Promise<boolean> {
  const pipe = await getPipeline();
  return pipe !== null;
}

/** Convert any supported image source to something transformers.js can read. */
async function toImageUrl(source: HandwritingImageSource): Promise<{ url: string; revoke: boolean }> {
  if (typeof source === 'string') return { url: source, revoke: false };
  if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
    return { url: source.toDataURL('image/png'), revoke: false };
  }
  const url = URL.createObjectURL(source as Blob);
  return { url, revoke: true };
}

/**
 * Recognize handwritten text from a page image. Returns `null` when the model
 * cannot run (non-browser runtime, load failure) so callers degrade gracefully.
 */
export async function recognizeHandwriting(
  source: HandwritingImageSource,
): Promise<string | null> {
  const pipe = await getPipeline();
  if (!pipe) return null;

  let url: string | null = null;
  let revoke = false;
  try {
    const resolved = await toImageUrl(source);
    url = resolved.url;
    revoke = resolved.revoke;
    const output = await pipe(url);
    const text = output?.[0]?.generated_text?.trim() ?? '';
    return text.length > 0 ? text : null;
  } catch (err) {
    console.warn('[handwritingOcr] recognition failed:', (err as Error).message);
    return null;
  } finally {
    if (url && revoke) URL.revokeObjectURL(url);
  }
}

/** Reset the model cache and loader. Useful for tests. */
export function resetHandwritingOcr(): void {
  pipelinePromise = null;
}

/** The OCR model id emitted when the client handwriting pass wins the ensemble merge. */
export const HANDWRITING_OCR_MODEL_ID = 'trocr-handwritten';

/**
 * True when handwriting recognition contributed to a file's extracted text.
 * Matches any handwriting-capable engine id, whether produced by the in-browser
 * TrOCR pass (`trocr-handwritten`) or the local/remote OCR server
 * (`vision-llm-handwriting`, `tesseract-handwriting-fallback`, ...).
 */
export function usedHandwritingOcr(ocrModelsUsed: string[] | undefined): boolean {
  return !!ocrModelsUsed?.some((m) => /handwrit/i.test(m));
}
