/**
 * Client orchestration for PDF math zone OCR repair (8B-alpha).
 */

import type { UserSettings } from '../types';
import { ocrMathRegions as ocrMathRegionsServer } from './authClient';
import { cropCanvasRegionToBase64, applyMathZoneRepairs } from './mathOcrRepair';
import type { PdfMathZone } from './pdfMathZones';
import { OCR_RENDER_SCALE_SERVER } from './ocrExtract';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

function proxyConfigured(settings?: UserSettings): boolean {
  return !!(settings?.llmProxyUrl?.trim() || settings?.authProxyBase?.trim());
}

async function loadPdfDocument(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

/** Render formula crops for zones that need server math OCR. */
export async function renderMathZoneCrops(
  file: File,
  zones: PdfMathZone[],
): Promise<{ zoneId: string; base64: string }[]> {
  const ocrZones = zones.filter((z) => z.needsOcr);
  if (ocrZones.length === 0) return [];

  const doc = await loadPdfDocument(file);
  const byPage = new Map<number, PdfMathZone[]>();
  for (const z of ocrZones) {
    const list = byPage.get(z.pageIndex) ?? [];
    list.push(z);
    byPage.set(z.pageIndex, list);
  }

  const crops: { zoneId: string; base64: string }[] = [];
  for (const [pageIndex, pageZones] of byPage) {
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE_SERVER });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;

    for (const zone of pageZones) {
      const base64 = cropCanvasRegionToBase64(canvas, zone.bbox);
      if (base64) crops.push({ zoneId: zone.id, base64 });
    }
  }
  return crops;
}

/**
 * Run math OCR on zones that need it and merge LaTeX into page texts.
 * No-op when proxy is not configured or there are no OCR zones.
 */
export async function repairPdfMathZones(
  file: File,
  pageTexts: string[],
  zones: PdfMathZone[],
  settings?: UserSettings,
): Promise<{ pageTexts: string[]; zones: PdfMathZone[]; mathOcrUsed: boolean }> {
  const needsOcr = zones.some((z) => z.needsOcr);
  if (!needsOcr) {
    const embedded = applyMathZoneRepairs(pageTexts, zones, {});
    return { ...embedded, mathOcrUsed: false };
  }

  if (!settings || !proxyConfigured(settings)) {
    const embedded = applyMathZoneRepairs(pageTexts, zones, {});
    return { ...embedded, mathOcrUsed: false };
  }

  try {
    const crops = await renderMathZoneCrops(file, zones);
    if (crops.length === 0) {
      const embedded = applyMathZoneRepairs(pageTexts, zones, {});
      return { ...embedded, mathOcrUsed: false };
    }

    const remote = await ocrMathRegionsServer(
      settings.authToken,
      settings,
      crops.map((c) => c.base64),
    );

    const ocrLatexByZoneId: Record<string, string> = {};
    for (let i = 0; i < crops.length; i++) {
      const crop = crops[i]!;
      ocrLatexByZoneId[crop.zoneId] = remote.latex[i] ?? '';
    }

    const repaired = applyMathZoneRepairs(pageTexts, zones, ocrLatexByZoneId);
    return { ...repaired, mathOcrUsed: true };
  } catch {
    const embedded = applyMathZoneRepairs(pageTexts, zones, {});
    return { ...embedded, mathOcrUsed: false };
  }
}
