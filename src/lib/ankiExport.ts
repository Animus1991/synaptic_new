/** Export flashcards as Anki-importable TSV (UTF-8). */
export type AnkiExportCard = {
  front: string;
  back: string;
  tags?: string[];
};

export function exportAnkiTsv(
  cards: AnkiExportCard[],
  deckName: string,
  deckTags: string[] = [],
): string {
  const tagLine = deckTags.length > 0 ? `#tags:${deckTags.join(' ')}` : '';
  const lines = [
    '#separator:tab',
    '#html:true',
    `#deck:${deckName.replace(/\t/g, ' ')}`,
    '#notetype:Basic',
    ...(tagLine ? [tagLine] : []),
    '#columns:front back tags',
  ];
  for (const card of cards) {
    const front = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tags = (card.tags ?? []).join(' ');
    lines.push(`${front}\t${back}\t${tags}`);
  }
  return lines.join('\n');
}

export function downloadAnkiDeck(
  cards: AnkiExportCard[],
  deckName: string,
  filename: string,
  deckTags: string[] = [],
) {
  const content = exportAnkiTsv(cards, deckName, deckTags);
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
