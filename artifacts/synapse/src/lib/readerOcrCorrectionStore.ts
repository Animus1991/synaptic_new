import { loadJson, saveJson } from './persistence';

export type OcrLineCorrection = {
  id: string;
  scopeKey: string;
  /** Index into paragraph blocks (same split as OCR overlay). */
  blockIndex: number;
  originalText: string;
  correctedText: string;
  updatedAt: string;
};

const KEY = 'reader-ocr-corrections';

function allCorrections(): Record<string, OcrLineCorrection[]> {
  return loadJson<Record<string, OcrLineCorrection[]>>(KEY, {});
}

export function loadOcrCorrections(scopeKey: string): OcrLineCorrection[] {
  if (!scopeKey) return [];
  return allCorrections()[scopeKey] ?? [];
}

export function saveOcrCorrection(correction: OcrLineCorrection): void {
  const all = allCorrections();
  const list = [...(all[correction.scopeKey] ?? [])];
  const idx = list.findIndex((c) => c.blockIndex === correction.blockIndex);
  if (idx >= 0) list[idx] = correction;
  else list.push(correction);
  all[correction.scopeKey] = list;
  saveJson(KEY, all);
}

export function removeOcrCorrection(scopeKey: string, blockIndex: number): void {
  const all = allCorrections();
  const list = (all[scopeKey] ?? []).filter((c) => c.blockIndex !== blockIndex);
  if (list.length === 0) delete all[scopeKey];
  else all[scopeKey] = list;
  saveJson(KEY, all);
}

/** Split text the same way as heuristic OCR overlay blocks. */
export function ocrParagraphBlocks(text: string): string[] {
  return text.split(/\n{2,}|\f/).map((b) => b.trim()).filter((b) => b.length > 0);
}

/** Apply stored line corrections to display text (Reader only — source file unchanged). */
export function applyOcrCorrectionsToText(text: string, scopeKey: string): string {
  if (!text.trim() || !scopeKey) return text;
  const corrections = loadOcrCorrections(scopeKey);
  if (corrections.length === 0) return text;

  const byIndex = new Map(corrections.map((c) => [c.blockIndex, c]));
  const parts = text.split(/(\n{2,}|\f)/);
  let blockIdx = 0;
  const out: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i]!;
    if (/^\n{2,}$/.test(chunk) || chunk === '\f') {
      out.push(chunk);
      continue;
    }
    const trimmed = chunk.trim();
    if (!trimmed) {
      out.push(chunk);
      continue;
    }
    const fix = byIndex.get(blockIdx);
    blockIdx += 1;
    if (fix?.correctedText.trim()) {
      out.push(fix.correctedText);
    } else {
      out.push(chunk);
    }
  }

  return out.join('');
}
