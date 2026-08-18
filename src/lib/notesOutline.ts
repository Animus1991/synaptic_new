/** Extract headings / outline lines from notes — used by sourceMode `notes-only`. */

const HEADING = /^(#{1,6}\s+\S.*|\d+[.)]\s+\S.{2,}|[A-ZΑ-ΩΆ-Ώ][^.\n]{2,80}:)\s*$/;

export function extractNotesOutline(text: string, maxLines = 40): string {
  const raw = text.replace(/\r\n/g, '\n').trim();
  if (!raw) return '';
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const headings = lines.filter((line) => HEADING.test(line));
  if (headings.length >= 2) {
    return headings.slice(0, maxLines).join('\n');
  }
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length >= 12);
  const firstSentences = paragraphs
    .map((p) => {
      const sentence = p.split(/(?<=[.!;])\s+/)[0] ?? p;
      return sentence.replace(/\s+/g, ' ').trim().slice(0, 160);
    })
    .filter(Boolean);
  if (firstSentences.length >= 2) {
    return firstSentences.slice(0, maxLines).join('\n');
  }
  return raw.slice(0, 800);
}

export function isNotesOnlySourceMode(mode: string | undefined): boolean {
  return mode === 'notes-only';
}
