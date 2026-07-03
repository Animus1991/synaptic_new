/** Client-side document text extraction (PDF, DOCX, PPTX, plain text, OCR). */



import mammoth from 'mammoth';

import JSZip from 'jszip';

import type { UserSettings } from '../types';
import { importChatGptExportFile, isChatGptExportFile, isLikelyChatGptExportJson } from './chatGptImport';

import { extractWithOcrFallback, isImageOnlyPdf, isImageUpload } from './ocrExtract';
import { extractAudioVideoTranscript, isAudioVideoFile } from './youtubeTranscript';
import { detectMathZonesFromPage, type PdfMathZone } from './pdfMathZones';
import { repairPdfMathZones } from './mathOcrClient';
import { extractLayoutBlocksFromPages, type PdfLayoutBlockInput } from './pdfLayoutBlocks';

// Vite resolves this to a stable public URL in dev + production builds.

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';



export type PdfExtractResult = {

  text: string;

  pageCount: number;

  ocrUsed?: boolean;

  ingestMethod?: FileExtractResult['ingestMethod'];

  ocrRegions?: FileExtractResult['ocrRegions'];

  mathZones?: PdfMathZone[];

  mathOcrUsed?: boolean;

  layoutBlocks?: PdfLayoutBlockInput[];

  ocrModelsUsed?: string[];

};



export type FileExtractResult = {

  text: string;

  pageCount?: number;

  ocrUsed?: boolean;

  ingestMethod?: 'text-layer' | 'ocr-client' | 'ocr-server' | 'ocr-ensemble' | 'ocr-vision' | 'chatgpt-export' | 'transcript';

  ocrRegions?: import('./readerOcrOverlay').OcrStoredRegion[];

  mathZones?: PdfMathZone[];

  mathOcrUsed?: boolean;

  layoutBlocks?: PdfLayoutBlockInput[];

  ocrModelsUsed?: string[];

};



interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

const LINE_TOLERANCE = 4;
const COLUMN_GAP_FRACTION = 0.03;

/** PDF user space: when transform d > 0, y increases upward (native PDF coords). */
function pdfVerticalSortDirection(items: TextItem[]): 'asc' | 'desc' {
  const ds = items
    .map((it) => it.transform[3] ?? 0)
    .filter((d) => Math.abs(d) > 0.01);
  if (ds.length === 0) return 'asc';
  const avg = ds.reduce((sum, d) => sum + d, 0) / ds.length;
  return avg > 0 ? 'desc' : 'asc';
}

/**
 * Reconstruct PDF text in human reading order using coordinates from PDF.js.
 *
 * 1. Items are grouped into horizontal lines by y-coordinate.
 * 2. Items within a line are sorted left-to-right.
 * 3. Lines are clustered into columns based on their x-ranges.
 * 4. Multi-column pages are read left column then right column.
 */
function layoutAwareTextFromItems(items: unknown[], pageWidth: number): string {
  const raw = items.filter((it) => it && typeof it === 'object' && 'str' in it) as TextItem[];
  const withCoords = raw
    .map((it) => {
      const t = it.transform;
      const x = t[4] ?? 0;
      const y = t[5] ?? 0;
      return { ...it, x, y, endX: x + it.width };
    })
    .filter((it) => it.str.trim().length > 0);

  if (withCoords.length === 0) return '';

  const ySort = pdfVerticalSortDirection(raw);

  // Group into lines by y-coordinate (tolerance for small variations).
  const sortedByY = [...withCoords].sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));
  const lines: { y: number; items: typeof withCoords }[] = [];
  for (const it of sortedByY) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= LINE_TOLERANCE);
    if (line) {
      line.items.push(it);
      line.y = (line.y + it.y) / 2;
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }

  // Sort lines top-to-bottom.
  lines.sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));

  // Sort items within each line left-to-right.
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  // Detect columns by looking at the dominant x ranges across lines.
  const columnGap = pageWidth * COLUMN_GAP_FRACTION;
  const columns: { minX: number; maxX: number }[] = [];
  for (const line of lines) {
    const lineMin = Math.min(...line.items.map((it) => it.x));
    const lineMax = Math.max(...line.items.map((it) => it.endX));
    const col = columns.find((c) => lineMin < c.maxX + columnGap && lineMax > c.minX - columnGap);
    if (col) {
      col.minX = Math.min(col.minX, lineMin);
      col.maxX = Math.max(col.maxX, lineMax);
    } else {
      columns.push({ minX: lineMin, maxX: lineMax });
    }
  }
  columns.sort((a, b) => a.minX - b.minX);

  const isMultiColumn = columns.length >= 2 && columns[0]!.maxX < pageWidth * 0.55;

  if (isMultiColumn) {
    // v2.4: column-major order — read full left column top-to-bottom, then right.
    const columnLines: string[][] = columns.map(() => []);
    for (const line of lines) {
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci]!;
        const colItems = line.items.filter((it) => {
          const mid = it.x + it.width / 2;
          return mid >= col.minX - columnGap && mid <= col.maxX + columnGap;
        });
        if (colItems.length > 0) {
          columnLines[ci]!.push(colItems.map((it) => it.str).join(' '));
        }
      }
    }
    return columnLines
      .map((colBlock) => colBlock.join('\n'))
      .filter((block) => block.trim().length > 0)
      .join('\n\n');
  }

  // Single-column: join line items, adding line breaks where PDF indicates EOL.
  return lines
    .map((line) => line.items.map((it) => it.str).join(' '))
    .join('\n');
}

export async function extractTextFromPdf(file: File, settings?: UserSettings): Promise<PdfExtractResult> {

  const pdfjs = await import('pdfjs-dist');

  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;



  const data = new Uint8Array(await file.arrayBuffer());

  const doc = await pdfjs.getDocument({ data }).promise;

  const parts: string[] = [];
  const pageCharCounts: number[] = [];
  const allMathZones: PdfMathZone[] = [];
  const pageLayoutInputs: {
    items: unknown[];
    styles: Record<string, { fontFamily?: string }> | undefined;
    pageHeight: number;
    pageText: string;
    pageIndex: number;
  }[] = [];



  for (let i = 1; i <= doc.numPages; i++) {

    const page = await doc.getPage(i);

    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageText = layoutAwareTextFromItems(content.items, viewport.width);
    parts.push(pageText);
    pageCharCounts.push(pageText.replace(/\s+/g, '').length);

    const styles = content.styles as Record<string, { fontFamily?: string }> | undefined;
    pageLayoutInputs.push({
      items: content.items,
      styles,
      pageHeight: viewport.height,
      pageText,
      pageIndex: i - 1,
    });
    const pageZones = detectMathZonesFromPage(
      content.items,
      styles,
      viewport.width,
      viewport.height,
      i - 1,
    );
    allMathZones.push(...pageZones);

  }



  const pageCount = doc.numPages;

  if (isImageOnlyPdf(pageCharCounts)) {
    const ocr = await extractWithOcrFallback(file, { text: '', pageCount }, settings);
    return {
      text: ocr.text,
      pageCount: ocr.pageCount,
      ocrUsed: ocr.ocrUsed,
      ingestMethod: ocr.ingestMethod ?? (ocr.ocrUsed ? 'ocr-client' : 'text-layer'),
      ocrRegions: ocr.ocrRegions,
      ocrModelsUsed: ocr.ocrModelsUsed,
    };
  }

  const mathRepair = await repairPdfMathZones(file, parts, allMathZones, settings);

  const repairedPages = pageLayoutInputs.map((page, idx) => ({
    ...page,
    pageText: mathRepair.pageTexts[idx] ?? page.pageText,
  }));
  const layoutBlocks = extractLayoutBlocksFromPages(repairedPages);

  const textLayer = {

    text: mathRepair.pageTexts.join('\n\f\n'),

    pageCount,

  };



  const withOcr = await extractWithOcrFallback(file, textLayer, settings);

  return {

    text: withOcr.text,

    pageCount: withOcr.pageCount,

    ocrUsed: withOcr.ocrUsed,

    ingestMethod: withOcr.ingestMethod ?? (withOcr.ocrUsed ? 'ocr-client' : 'text-layer'),

    ocrRegions: withOcr.ocrRegions,

    mathZones: mathRepair.zones,

    mathOcrUsed: mathRepair.mathOcrUsed,

    layoutBlocks: withOcr.ocrUsed ? undefined : layoutBlocks,

    ocrModelsUsed: withOcr.ocrModelsUsed,

  };

}



export async function extractTextFromDocx(file: File): Promise<string> {

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });

  return result.value;

}



export async function extractTextFromPptx(file: File): Promise<{ text: string; pageCount: number }> {

  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const slidePaths = Object.keys(zip.files)

    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))

    .sort((a, b) => {

      const na = Number(a.match(/slide(\d+)/i)?.[1] ?? 0);

      const nb = Number(b.match(/slide(\d+)/i)?.[1] ?? 0);

      return na - nb;

    });



  const parts: string[] = [];

  for (const path of slidePaths) {

    const xml = await zip.files[path].async('string');

    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]?.trim()).filter(Boolean);

    if (texts.length > 0) parts.push(texts.join(' '));

  }



  return { text: parts.join('\n\f\n'), pageCount: slidePaths.length };

}



export async function extractTextFromFile(file: File, settings?: UserSettings): Promise<FileExtractResult> {

  if (isImageUpload(file)) {

    const ocr = await extractWithOcrFallback(file, { text: '', pageCount: 1 }, settings);

    return {
      text: ocr.text,
      pageCount: 1,
      ocrUsed: ocr.ocrUsed,
      ingestMethod: ocr.ingestMethod ?? 'ocr-client',
      ocrRegions: ocr.ocrRegions,
      ocrModelsUsed: ocr.ocrModelsUsed,
    };

  }

  if (isAudioVideoFile(file)) {
    const transcript = await extractAudioVideoTranscript(file, {
      authProxyBase: settings?.llmProxyUrl?.replace(/\/v1\/?$/, ''),
      llmProxyUrl: settings?.llmProxyUrl,
      authToken: settings?.authToken,
    });
    if (transcript?.text) {
      return { text: transcript.text, ingestMethod: 'transcript' };
    }
    return { text: '' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf' || file.type === 'application/pdf') {

    const pdf = await extractTextFromPdf(file, settings);
    return {
      text: pdf.text,
      pageCount: pdf.pageCount,
      ocrUsed: pdf.ocrUsed,
      ingestMethod: pdf.ingestMethod,
      ocrRegions: pdf.ocrRegions,
      mathZones: pdf.mathZones,
      mathOcrUsed: pdf.mathOcrUsed,
      layoutBlocks: pdf.layoutBlocks,
      ocrModelsUsed: pdf.ocrModelsUsed,
    };

  }

  if (ext === 'docx' || ext === 'doc' || file.type.includes('wordprocessingml')) {

    return { text: await extractTextFromDocx(file) };

  }

  if (ext === 'pptx' || ext === 'ppt' || file.type.includes('presentationml')) {

    return extractTextFromPptx(file);

  }

  if (

    file.type.startsWith('text/')

    || ext === 'txt'

    || ext === 'md'

    || ext === 'csv'

    || ext === 'py'

    || ext === 'js'

    || ext === 'ts'

    || ext === 'tsx'

    || ext === 'jsx'

    || ext === 'sql'

    || ext === 'r'

    || ext === 'json'

    || ext === 'html'

    || ext === 'xml'

    || ext === 'zip'

  ) {

    if (ext === 'zip' && isChatGptExportFile(file)) {

      try {

        const imported = await importChatGptExportFile(file);

        return { text: imported.text, pageCount: imported.conversations.length, ocrUsed: false, ingestMethod: 'chatgpt-export' };

      } catch {

        /* fall through */

      }

    }

    if (ext === 'json') {

      const raw = await file.text();

      try {

        if (isLikelyChatGptExportJson(JSON.parse(raw))) {

          const imported = await importChatGptExportFile(file);

          return { text: imported.text, pageCount: imported.conversations.length, ocrUsed: false, ingestMethod: 'chatgpt-export' };

        }

      } catch {

        /* plain json */

      }

      return { text: raw };

    }

    return { text: await file.text() };

  }

  return { text: '' };

}


