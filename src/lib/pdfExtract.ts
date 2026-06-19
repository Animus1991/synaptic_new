/** Client-side document text extraction (PDF, DOCX, PPTX, plain text). */

import mammoth from 'mammoth';
import JSZip from 'jszip';

export type PdfExtractResult = {
  text: string;
  pageCount: number;
};

export async function extractTextFromPdf(file: File): Promise<PdfExtractResult> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    parts.push(pageText);
  }

  return {
    text: parts.join('\n\n'),
    pageCount: doc.numPages,
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

  return { text: parts.join('\n\n'), pageCount: slidePaths.length };
}

export async function extractTextFromFile(file: File): Promise<{ text: string; pageCount?: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return extractTextFromPdf(file);
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
  ) {
    return { text: await file.text() };
  }
  return { text: '' };
}