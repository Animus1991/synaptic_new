/** Parse Anki-exported TSV (UTF-8) into flashcards. */
export function parseAnkiTsv(content: string): { front: string; back: string; deck?: string; tags?: string[] }[] {
  const lines = content.split(/\r?\n/);
  let deck: string | undefined;
  let tags: string[] = [];
  const cards: { front: string; back: string; deck?: string; tags?: string[] }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      if (line.startsWith('#deck:')) deck = line.slice('#deck:'.length).trim();
      if (line.startsWith('#tags:')) tags = line.slice('#tags:'.length).trim().split(/\s+/).filter(Boolean);
      continue;
    }
    const parts = raw.split('\t');
    if (parts.length < 2) continue;
    const front = unescapeAnkiHtml(parts[0]!.trim());
    const back = unescapeAnkiHtml(parts[1]!.trim());
    if (!front && !back) continue;
    cards.push({ front, back, deck, tags: tags.length ? [...tags] : undefined });
  }
  return cards;
}

function unescapeAnkiHtml(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
}

export async function readAnkiFile(file: File): Promise<{ front: string; back: string }[]> {
  const text = await file.text();
  return parseAnkiTsv(text);
}
