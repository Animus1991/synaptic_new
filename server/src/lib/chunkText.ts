import { createHash } from 'node:crypto';

export type ServerSourceChunk = {
  id: string;
  fileId: string;
  fileName: string;
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  heading?: string;
  page?: number;
  contentHash: string;
};

const TARGET_CHARS = 900;
const OVERLAP_CHARS = 160;
const MIN_CHUNK_CHARS = 60;

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** Paragraph-aware chunk splitter aligned with client `rag.ts` defaults. */
export function chunkText(text: string, fileId: string, fileName: string): ServerSourceChunk[] {
  if (!text?.trim()) return [];

  const normalized = text.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: ServerSourceChunk[] = [];
  let buffer = '';
  let charStart = 0;
  let cursor = 0;
  let heading: string | undefined;
  let page = 1;
  let index = 0;

  const flush = (end: number) => {
    const body = buffer.trim();
    if (body.length < MIN_CHUNK_CHARS) return;
    const chunkTextValue = body;
    chunks.push({
      id: `${fileId}#${index}`,
      fileId,
      fileName,
      index,
      text: chunkTextValue,
      charStart,
      charEnd: end,
      heading,
      page,
      contentHash: hashText(chunkTextValue),
    });
    index += 1;
    const overlap = chunkTextValue.slice(-OVERLAP_CHARS);
    buffer = overlap;
    charStart = Math.max(0, end - overlap.length);
  };

  for (const rawPara of paragraphs) {
    const para = rawPara.trim();
    if (!para) {
      cursor += rawPara.length + 2;
      continue;
    }
    if (para.includes('\f')) {
      page += 1;
    }
    if (para.length < 80 && !para.endsWith('.') && !/^\d+\./.test(para)) {
      heading = para;
    }
    const next = buffer ? `${buffer}\n\n${para}` : para;
    if (next.length >= TARGET_CHARS) {
      flush(cursor + para.length);
    } else {
      buffer = next;
    }
    cursor += rawPara.length + 2;
  }

  if (buffer.trim().length >= MIN_CHUNK_CHARS) {
    flush(normalized.length);
  }

  return chunks;
}
