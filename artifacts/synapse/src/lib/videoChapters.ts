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
