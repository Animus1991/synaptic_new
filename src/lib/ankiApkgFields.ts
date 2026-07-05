/** Anki note field separator (unit separator). */
export const ANKI_FIELD_SEP = '\u001f';

export function splitAnkiNoteFields(flds: string): string[] {
  return flds.split(ANKI_FIELD_SEP);
}

export function stripAnkiFieldHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function noteFieldsToFrontBack(fields: string[]): { front: string; back: string } {
  const front = stripAnkiFieldHtml(fields[0] ?? '');
  const back = stripAnkiFieldHtml(fields[1] ?? fields.slice(1).join('\n'));
  return { front, back };
}

export function parseAnkiTags(tags: string): string[] {
  return tags.trim().split(/\s+/).filter(Boolean);
}

export function formatAnkiTags(tags: string[] | undefined): string {
  if (!tags?.length) return '';
  return ` ${tags.join(' ')} `;
}

export function escapeAnkiFieldHtml(text: string): string {
  return text.replace(/\t/g, ' ').replace(/\n/g, '<br>');
}

/** FNV-1a style checksum Anki uses for the first field (sfld/csum). */
export function ankiFieldChecksum(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomAnkiGuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
