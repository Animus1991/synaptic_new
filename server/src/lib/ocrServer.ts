import Tesseract from 'tesseract.js';
import { config } from '../config';
import { mergeServerOcrOutputs, type ServerOcrModelId } from './bilingualOcrEnsemble';

export type OcrServerRegion = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
  pageIndex: number;
};

const TESS_LANGS: Array<{ modelId: ServerOcrModelId; langs: string }> = [
  { modelId: 'tesseract-eng+ell', langs: 'eng+ell' },
  { modelId: 'tesseract-eng', langs: 'eng' },
  { modelId: 'tesseract-ell', langs: 'ell' },
];

function wordsToRegions(
  words: Array<{ text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>,
  imageWidth: number,
  imageHeight: number,
  pageIndex: number,
): OcrServerRegion[] {
  const w = imageWidth > 0 ? imageWidth : 1;
  const h = imageHeight > 0 ? imageHeight : 1;
  const regions: OcrServerRegion[] = [];
  for (const word of words) {
    const text = word.text?.trim();
    const bbox = word.bbox;
    if (!text || !bbox) continue;
    const width = bbox.x1 - bbox.x0;
    const height = bbox.y1 - bbox.y0;
    if (width <= 0 || height <= 0) continue;
    regions.push({
      text,
      left: (bbox.x0 / w) * 100,
      top: (bbox.y0 / h) * 100,
      width: (width / w) * 100,
      height: (height / h) * 100,
      confidence: Math.max(0, Math.min(1, (word.confidence ?? 0) / 100)),
      pageIndex,
    });
  }
  return regions;
}

async function recognizeWithLang(buf: Buffer, langs: string) {
  const worker = await Tesseract.createWorker(langs);
  try {
    return await worker.recognize(buf);
  } finally {
    await worker.terminate();
  }
}

export async function ocrBase64Pages(
  pages: string[],
  _languages = 'eng+ell',
): Promise<{ text: string; pagesProcessed: number; regions: OcrServerRegion[]; modelsUsed: string[] }> {
  const slice = pages.slice(0, config.ocrMaxPages).filter((p) => typeof p === 'string' && p.length > 0);
  if (slice.length === 0) return { text: '', pagesProcessed: 0, regions: [], modelsUsed: [] };

  const parts: string[] = [];
  const regions: OcrServerRegion[] = [];
  const allModels = new Set<string>();

  for (let pageIndex = 0; pageIndex < slice.length; pageIndex++) {
    const page = slice[pageIndex]!;
    const buf = Buffer.from(page, 'base64');

    const parallel = await Promise.all(
      TESS_LANGS.map(async ({ modelId, langs }) => {
        try {
          const { data } = await recognizeWithLang(buf, langs);
          return { modelId, text: data.text.trim(), data };
        } catch {
          return { modelId, text: '', data: null };
        }
      }),
    );

    const merged = mergeServerOcrOutputs(
      parallel.map((p) => ({ modelId: p.modelId, text: p.text })),
    );
    for (const m of merged.modelsUsed) allModels.add(m);

    if (merged.text) parts.push(merged.text);

    const best = parallel.find((p) => p.text === merged.text) ?? parallel[0];
    const data = best?.data;
    if (data) {
      const imageWidth = (data as { imageWidth?: number }).imageWidth ?? 0;
      const imageHeight = (data as { imageHeight?: number }).imageHeight ?? 0;
      const words = (data as { words?: Array<{ text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }> }).words ?? [];
      regions.push(...wordsToRegions(words, imageWidth, imageHeight, pageIndex));
    }
  }

  return {
    text: parts.join('\n\f\n'),
    pagesProcessed: slice.length,
    regions,
    modelsUsed: [...allModels],
  };
}
