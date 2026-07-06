import { formatChapterTimestamp } from './videoChapters';

export type NotebookLmAudioSegment = {
  index: number;
  title: string;
  startSec: number | null;
  text: string;
};

const TIMESTAMP_BRACKET = /^\[(\d{1,2}:)?(\d{1,2}):(\d{2})\]\s*(.*)$/;
const TIMESTAMP_DASH = /^(\d{1,2}):(\d{2})\s*[-–—]\s*(.+)$/;
const MARKDOWN_SECTION = /^#{1,3}\s+(?:\[(\d{1,2}:)?(\d{1,2}):(\d{2})\]\s*)?(.+)$/;

function parseTimestampToSec(h: string | undefined, m: string, s: string): number {
  const mins = h ? Number(h.replace(':', '')) * 60 + Number(m) : Number(m);
  return mins * 60 + Number(s);
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function parseSectionHeader(line: string): { title: string; startSec: number | null } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const bracket = trimmed.match(TIMESTAMP_BRACKET);
  if (bracket) {
    const startSec = parseTimestampToSec(bracket[1], bracket[2]!, bracket[3]!);
    const title = stripInlineMarkdown(bracket[4] || 'Section');
    return { title: title || 'Section', startSec };
  }

  const dash = trimmed.match(TIMESTAMP_DASH);
  if (dash) {
    return {
      title: stripInlineMarkdown(dash[3]!),
      startSec: parseTimestampToSec(undefined, dash[1]!, dash[2]!),
    };
  }

  const md = trimmed.match(MARKDOWN_SECTION);
  if (md) {
    const title = stripInlineMarkdown(md[4]!);
    const startSec =
      md[2] != null && md[3] != null
        ? parseTimestampToSec(md[1], md[2], md[3])
        : null;
    return { title, startSec };
  }

  return null;
}

/** Parse NotebookLM Studio audio overview / transcript paste. */
export function parseNotebookLmAudioTranscript(raw: string): NotebookLmAudioSegment[] {
  const lines = raw.trim().split(/\r?\n/);
  const segments: NotebookLmAudioSegment[] = [];
  let title = 'Overview';
  let startSec: number | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (!text && segments.length === 0 && !title) return;
    if (text || segments.length > 0) {
      segments.push({
        index: segments.length,
        title,
        startSec,
        text,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const header = parseSectionHeader(line);
    if (header && (header.title || header.startSec != null)) {
      flush();
      title = header.title || `Section ${segments.length + 1}`;
      startSec = header.startSec;
      continue;
    }
    if (line.trim() || buffer.length > 0) buffer.push(line);
  }
  flush();

  const meaningful = segments.filter((s) => s.text.length >= 12 || s.startSec != null);
  if (meaningful.length >= 2) return meaningful.map((s, index) => ({ ...s, index }));

  if (segments.length === 1 && segments[0]!.text.length >= 40) {
    return [{ ...segments[0]!, index: 0 }];
  }

  const paragraphs = raw.trim().split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length >= 20);
  if (paragraphs.length >= 2) {
    return paragraphs.map((text, index) => ({
      index,
      title: index === 0 ? 'Introduction' : `Part ${index + 1}`,
      startSec: null,
      text,
    }));
  }

  return meaningful.length > 0 ? meaningful.map((s, index) => ({ ...s, index })) : [];
}

export function formatNotebookLmAudioMarkdown(
  segments: NotebookLmAudioSegment[],
  title?: string,
): string {
  const lines: string[] = [];
  if (title?.trim()) lines.push(`# ${title.trim()}`, '');
  for (const segment of segments) {
    const stamp =
      segment.startSec != null ? `[${formatChapterTimestamp(segment.startSec)}] ` : '';
    lines.push(`### ${stamp}${segment.title}`, '', segment.text, '');
  }
  return lines.join('\n').trim();
}

export function inferNotebookLmAudioTitle(raw: string, segments: NotebookLmAudioSegment[]): string {
  const heading = raw.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return stripInlineMarkdown(heading[1]).slice(0, 120);
  if (/audio overview|audio transcript|studio audio/i.test(raw)) {
    return 'NotebookLM audio overview';
  }
  return segments[0]?.title?.slice(0, 80) || 'NotebookLM audio transcript';
}

export function isNotebookLmAudioTranscript(
  raw: string,
  segments: NotebookLmAudioSegment[],
  opts?: { isChat?: boolean; quizCardCount?: number },
): boolean {
  if (opts?.isChat) return false;
  if (opts?.quizCardCount && opts.quizCardCount >= 2) return false;
  if (segments.length === 0) return false;

  const hasTimestamp = /\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]/m.test(raw) || /^\d{1,2}:\d{2}\s*[-–—]/m.test(raw);
  const hasAudioKeyword = /audio overview|audio transcript|studio audio|ηχητική περίληψη/i.test(raw);
  const hasTimedSegments = segments.filter((s) => s.startSec != null).length >= 2;

  if (hasTimestamp || hasTimedSegments) return true;
  if (hasAudioKeyword && segments.length >= 1) return true;

  return false;
}

/** Re-parse segments from stored markdown (Course media panel). */
export function parseNotebookLmAudioFromMarkdown(markdown: string): NotebookLmAudioSegment[] {
  const fromStored = parseNotebookLmAudioTranscript(markdown);
  if (fromStored.length > 0) return fromStored;
  return [];
}
