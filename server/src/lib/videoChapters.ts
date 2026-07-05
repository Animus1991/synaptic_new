export type WhisperSegment = {
  start: number;
  end: number;
  text: string;
};

export type VideoChapter = {
  index: number;
  title: string;
  startSec: number;
  endSec: number;
  preview: string;
};

export function formatChapterTimestamp(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function chapterTitleFromText(text: string, maxLen = 52): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Chapter';
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
}

/** Group Whisper segments into navigable chapters (gap- or duration-based). */
export function buildVideoChapters(
  segments: WhisperSegment[],
  opts?: { minGapSec?: number; maxChapterSec?: number },
): VideoChapter[] {
  const minGapSec = opts?.minGapSec ?? 2.5;
  const maxChapterSec = opts?.maxChapterSec ?? 120;
  const rows = segments
    .map((s) => ({
      start: Number(s.start),
      end: Number(s.end),
      text: s.text?.trim() ?? '',
    }))
    .filter((s) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end));
  if (rows.length === 0) return [];

  const chapters: VideoChapter[] = [];
  let bucket: WhisperSegment[] = [rows[0]!];

  const flush = () => {
    if (bucket.length === 0) return;
    const startSec = bucket[0]!.start;
    const endSec = bucket[bucket.length - 1]!.end;
    const fullText = bucket.map((s) => s.text).join(' ');
    chapters.push({
      index: chapters.length,
      title: chapterTitleFromText(fullText),
      startSec,
      endSec,
      preview: fullText.slice(0, 280),
    });
    bucket = [];
  };

  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    const gap = cur.start - prev.end;
    const span = cur.end - bucket[0]!.start;
    if (gap >= minGapSec || span >= maxChapterSec) {
      flush();
      bucket = [cur];
    } else {
      bucket.push(cur);
    }
  }
  flush();
  return chapters;
}

export function parseWhisperVerboseJson(body: unknown): {
  text: string;
  segments: WhisperSegment[];
} {
  if (!body || typeof body !== 'object') return { text: '', segments: [] };
  const row = body as { text?: string; segments?: unknown[] };
  const text = row.text?.trim() ?? '';
  const segments: WhisperSegment[] = [];
  if (Array.isArray(row.segments)) {
    for (const raw of row.segments) {
      if (!raw || typeof raw !== 'object') continue;
      const seg = raw as { start?: number; end?: number; text?: string };
      if (typeof seg.text !== 'string') continue;
      segments.push({
        start: Number(seg.start ?? 0),
        end: Number(seg.end ?? 0),
        text: seg.text.trim(),
      });
    }
  }
  return { text, segments };
}
