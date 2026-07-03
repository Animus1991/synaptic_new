/**
 * Wave 6.8i — Concurrent bilingual (Greek + English) character recognition ensemble.
 * Runs multiple OCR / repair passes in parallel and merges the best result.
 */

import { repairGreekDocumentText } from './greekTextRepair';
import { runDocumentTextPipeline } from './documentTextPipeline';
import { recognizeHandwriting, shouldAttemptHandwritingOcr } from './handwritingOcr';

export type OcrModelId =
  | 'text-layer'
  | 'tesseract-eng+ell'
  | 'tesseract-eng'
  | 'tesseract-ell'
  | 'greek-document-repair'
  | 'unicode-nfc'
  | 'latin-confusion-repair'
  | 'mixed-script-boundary'
  | 'trocr-handwritten';

export const BILINGUAL_OCR_MODELS: OcrModelId[] = [
  'tesseract-eng+ell',
  'tesseract-eng',
  'tesseract-ell',
  'greek-document-repair',
  'unicode-nfc',
  'latin-confusion-repair',
  'mixed-script-boundary',
  'trocr-handwritten',
];

export type OcrCandidate = {
  modelId: OcrModelId;
  text: string;
  score: number;
};

const GREEK = /\p{Script=Greek}/u;
const LATIN = /[A-Za-z]/;

function countScriptLetters(text: string): { greek: number; latin: number; other: number } {
  let greek = 0;
  let latin = 0;
  let other = 0;
  for (const ch of text) {
    if (GREEK.test(ch)) greek += 1;
    else if (LATIN.test(ch)) latin += 1;
    else if (/\p{L}/u.test(ch)) other += 1;
  }
  return { greek, latin, other };
}

/** Heuristic quality score — higher is better for EL/EN study material. */
export function scoreBilingualOcrText(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 12) return trimmed.length * 0.1;

  const { greek, latin } = countScriptLetters(trimmed);
  const letters = greek + latin;
  if (letters === 0) return 0;

  let score = Math.min(trimmed.length, 4000) * 0.02;
  score += Math.min(greek, 800) * 0.04;
  score += Math.min(latin, 800) * 0.035;

  const tokens = trimmed.split(/\s+/);
  const spacedGlyphTokens = tokens.filter((t) =>
    t.length === 1 && (GREEK.test(t) || LATIN.test(t)),
  ).length;
  if (spacedGlyphTokens / Math.max(tokens.length, 1) > 0.25) score -= 18;

  const longGlue = trimmed.match(/[\p{Script=Greek}]{14,}/gu);
  if (longGlue?.length) score -= 8 * longGlue.length;

  const words = tokens.filter((t) => t.length >= 3);
  score += Math.min(words.length, 120) * 0.15;

  return score;
}

export function applyUnicodeNfc(text: string): string {
  return text.normalize('NFC');
}

/** Common Latin OCR confusions in English tokens. */
export function repairLatinOcrConfusions(text: string): string {
  return text
    .replace(/\b([A-Z0-9]{2,})0([A-Z0-9]{2,})\b/g, '$1O$2')
    .replace(/\b([a-z]{2,})1([a-z]{2,})\b/g, '$1l$2');
}

/** Insert spaces at Greek↔Latin script boundaries. */
export function repairMixedScriptBoundaries(text: string): string {
  return text
    .replace(/([\p{Script=Greek}])([A-Za-z])/gu, '$1 $2')
    .replace(/([A-Za-z])([\p{Script=Greek}])/gu, '$1 $2');
}

export function buildPostProcessCandidates(raw: string, sourceModel: OcrModelId): OcrCandidate[] {
  const base = raw.trim();
  if (!base) return [];

  const repaired = repairGreekDocumentText(base);
  const nfc = applyUnicodeNfc(repaired);
  const latin = repairLatinOcrConfusions(nfc);
  const boundary = repairMixedScriptBoundaries(latin);

  const variants: Array<{ modelId: OcrModelId; text: string }> = [
    { modelId: sourceModel, text: base },
    { modelId: 'greek-document-repair', text: repaired },
    { modelId: 'unicode-nfc', text: nfc },
    { modelId: 'latin-confusion-repair', text: latin },
    { modelId: 'mixed-script-boundary', text: boundary },
  ];

  const seen = new Set<string>();
  const out: OcrCandidate[] = [];
  for (const v of variants) {
    const key = v.text.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ modelId: v.modelId, text: key, score: scoreBilingualOcrText(key) });
  }
  return out;
}

export function mergeBilingualOcrCandidates(candidates: OcrCandidate[]): {
  text: string;
  score: number;
  winningModel: OcrModelId;
  modelsUsed: OcrModelId[];
} {
  if (candidates.length === 0) {
    return { text: '', score: 0, winningModel: 'text-layer', modelsUsed: [] };
  }

  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const best = ranked[0]!;
  const modelsUsed = [...new Set(candidates.map((c) => c.modelId))];

  return {
    text: best.text,
    score: best.score,
    winningModel: best.modelId,
    modelsUsed,
  };
}

/** Normalize any extracted text (PDF layer, paste, OCR) for Reader / Compare parity. */
export function normalizeBilingualExtractedText(text: string): string {
  const merged = mergeBilingualOcrCandidates(
    buildPostProcessCandidates(text, 'text-layer'),
  );
  const base = merged.text || text.trim();
  return runDocumentTextPipeline(base).text;
}

const TESSERACT_LANGS: Array<{ modelId: OcrModelId; langs: string }> = [
  { modelId: 'tesseract-eng+ell', langs: 'eng+ell' },
  { modelId: 'tesseract-eng', langs: 'eng' },
  { modelId: 'tesseract-ell', langs: 'ell' },
];

async function recognizeWithTesseractLang(
  source: File | HTMLCanvasElement,
  langs: string,
): Promise<{ text: string; confidence: number | null }> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(langs);
  try {
    const { data } = await worker.recognize(source);
    const confidence = typeof data.confidence === 'number' ? data.confidence : null;
    return { text: data.text.trim(), confidence };
  } finally {
    await worker.terminate();
  }
}

/**
 * Run all Tesseract language packs concurrently, then post-process each. When the
 * printed-OCR confidence is low (likely handwriting), also run a transformers.js
 * TrOCR pass and add it as a candidate — the scoring merge keeps whichever wins.
 */
export async function runClientBilingualOcrEnsemble(
  source: File | HTMLCanvasElement,
): Promise<{ text: string; modelsUsed: OcrModelId[]; winningModel: OcrModelId }> {
  const rawResults = await Promise.all(
    TESSERACT_LANGS.map(async ({ modelId, langs }) => {
      try {
        const { text, confidence } = await recognizeWithTesseractLang(source, langs);
        return { modelId, text, confidence };
      } catch {
        return { modelId, text: '', confidence: null };
      }
    }),
  );

  const candidates: OcrCandidate[] = [];
  for (const { modelId, text } of rawResults) {
    if (!text) continue;
    candidates.push(...buildPostProcessCandidates(text, modelId));
  }

  const bestPrinted = mergeBilingualOcrCandidates(candidates).text;
  const confidences = rawResults
    .map((r) => r.confidence)
    .filter((c): c is number => c !== null);
  const meanConfidence = confidences.length
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : null;

  if (shouldAttemptHandwritingOcr(bestPrinted, meanConfidence)) {
    try {
      const handwritten = await recognizeHandwriting(source);
      if (handwritten) {
        candidates.push(...buildPostProcessCandidates(handwritten, 'trocr-handwritten'));
      }
    } catch {
      /* handwriting model unavailable — printed candidates stand */
    }
  }

  const merged = mergeBilingualOcrCandidates(candidates);
  return {
    text: merged.text,
    modelsUsed: merged.modelsUsed,
    winningModel: merged.winningModel,
  };
}

/** Score-only merge for server-side parallel Tesseract outputs. */
export function mergeParallelTesseractOutputs(
  outputs: Array<{ modelId: OcrModelId; text: string }>,
): ReturnType<typeof mergeBilingualOcrCandidates> {
  const candidates: OcrCandidate[] = [];
  for (const out of outputs) {
    if (!out.text.trim()) continue;
    candidates.push(...buildPostProcessCandidates(out.text, out.modelId));
  }
  return mergeBilingualOcrCandidates(candidates);
}
