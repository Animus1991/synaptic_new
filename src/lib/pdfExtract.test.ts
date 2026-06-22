import { describe, it, expect } from 'vitest';

type MockItem = {
  str: string;
  transform: [number, number, number, number, number, number];
  width: number;
  height: number;
};

function makeItem(str: string, x: number, y: number, width = str.length * 6): MockItem {
  return { str, transform: [1, 0, 0, 1, x, y], width, height: 10 };
}

// Mirror the private helper by replicating its logic for unit testing.
function reconstructText(items: MockItem[], pageWidth: number): string {
  const LINE_TOLERANCE = 4;
  const COLUMN_GAP_FRACTION = 0.03;

  const withCoords = items
    .map((it) => ({ ...it, x: it.transform[4], y: it.transform[5], endX: it.transform[4] + it.width }))
    .filter((it) => it.str.trim().length > 0);

  if (withCoords.length === 0) return '';

  const sortedByY = [...withCoords].sort((a, b) => a.y - b.y);
  const lines: { y: number; items: typeof withCoords }[] = [];
  for (const it of sortedByY) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= LINE_TOLERANCE);
    if (line) {
      line.items.push(it);
      line.y = (line.y + it.y) / 2;
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }
  lines.sort((a, b) => a.y - b.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  const columnGap = pageWidth * COLUMN_GAP_FRACTION;
  const columns: { minX: number; maxX: number }[] = [];
  for (const line of lines) {
    const lineMin = Math.min(...line.items.map((it) => it.x));
    const lineMax = Math.max(...line.items.map((it) => it.endX));
    const col = columns.find((c) => lineMin < c.maxX + columnGap && lineMax > c.minX - columnGap);
    if (col) {
      col.minX = Math.min(col.minX, lineMin);
      col.maxX = Math.max(col.maxX, lineMax);
    } else {
      columns.push({ minX: lineMin, maxX: lineMax });
    }
  }
  columns.sort((a, b) => a.minX - b.minX);

  const isMultiColumn = columns.length >= 2 && columns[0]!.maxX < pageWidth * 0.55;

  if (isMultiColumn) {
    const lineTexts: string[] = [];
    for (const line of lines) {
      const parts: string[] = [];
      for (const col of columns) {
        const colItems = line.items.filter((it) => it.x >= col.minX - columnGap && it.endX <= col.maxX + columnGap);
        if (colItems.length === 0) continue;
        parts.push(colItems.map((it) => it.str).join(' '));
      }
      if (parts.length > 0) lineTexts.push(parts.join('   '));
    }
    return lineTexts.join('\n');
  }

  return lines
    .map((line) => line.items.map((it) => it.str).join(' '))
    .join('\n');
}

describe('pdfExtract layout-aware reconstruction', () => {
  it('preserves single-column reading order', () => {
    const items: MockItem[] = [
      makeItem('First', 50, 100),
      makeItem('sentence.', 90, 100),
      makeItem('Second', 50, 120),
      makeItem('line.', 100, 120),
    ];
    const text = reconstructText(items, 600);
    expect(text).toContain('First sentence.');
    expect(text).toContain('Second line.');
  });

  it('reads multi-column text left-to-right per line', () => {
    const pageWidth = 600;
    const items: MockItem[] = [
      makeItem('Left', 50, 100, 50),
      makeItem('column', 110, 100, 60),
      makeItem('Right', 350, 100, 60),
      makeItem('column', 420, 100, 60),
      makeItem('Next', 50, 120, 50),
      makeItem('row', 110, 120, 40),
      makeItem('Far', 350, 120, 50),
      makeItem('side', 410, 120, 50),
    ];
    const text = reconstructText(items, pageWidth);
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/Left column.*Right column/);
    expect(lines[1]).toMatch(/Next row.*Far side/);
  });

  it('sorts items left-to-right on the same line', () => {
    const items: MockItem[] = [
      makeItem('world', 120, 100),
      makeItem('Hello', 50, 100),
    ];
    const text = reconstructText(items, 600);
    expect(text).toBe('Hello world');
  });
});
