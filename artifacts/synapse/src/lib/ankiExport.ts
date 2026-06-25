/** Export flashcards as Anki-importable TSV (UTF-8). */
export function exportAnkiTsv(
  cards: { front: string; back: string }[],
  deckName: string,
  tags: string[] = [],
): string {
  const tagLine = tags.length > 0 ? `#tags:${tags.join(' ')}` : '';
  const lines = [
    '#separator:tab',
    '#html:true',
    `#deck:${deckName.replace(/\t/g, ' ')}`,
    '#notetype:Basic',
    ...(tagLine ? [tagLine] : []),
    '#columns:front back',
  ];
  for (const card of cards) {
    const front = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    lines.push(`${front}\t${back}`);
  }
  return lines.join('\n');
}

export function downloadAnkiDeck(
  cards: { front: string; back: string }[],
  deckName: string,
  filename: string,
  tags: string[] = [],
) {
  const content = exportAnkiTsv(cards, deckName, tags);
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
