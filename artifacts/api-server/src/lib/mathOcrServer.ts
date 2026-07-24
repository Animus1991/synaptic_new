/**
 * Server-side math OCR over client-rendered formula crops (8B-alpha).
 * Uses Tesseract with math-oriented normalization; pix2tex deferred to 8B-β.
 */

import Tesseract from 'tesseract.js';
import { isPlausibleMathLatex, normalizeMathOcrToLatex } from './mathOcrNormalize';

export type MathOcrRegionResult = {
  latex: string;
  raw: string;
  confidence: number;
};

async function recognizeMathCrop(buf: Buffer): Promise<MathOcrRegionResult> {
  const worker = await Tesseract.createWorker('eng');
  try {
    const { data } = await worker.recognize(buf);
    const raw = data.text.replace(/\s+/g, ' ').trim();
    const latex = normalizeMathOcrToLatex(raw);
    const confidence = Math.max(0, Math.min(1, (data.confidence ?? 0) / 100));
    return { latex, raw, confidence };
  } finally {
    await worker.terminate();
  }
}

/** OCR an array of base64 JPEG formula crops → LaTeX strings. */
export async function ocrMathBase64Regions(
  regions: string[],
): Promise<{ latex: string[]; modelsUsed: string[] }> {
  const slice = regions.filter((r) => typeof r === 'string' && r.length > 0);
  const latex: string[] = [];
  for (const region of slice) {
    try {
      const buf = Buffer.from(region, 'base64');
      const result = await recognizeMathCrop(buf);
      latex.push(isPlausibleMathLatex(result.latex) ? result.latex : result.raw);
    } catch {
      latex.push('');
    }
  }
  return { latex, modelsUsed: ['tesseract-eng-math-alpha', 'math-ocr-normalize'] };
}
