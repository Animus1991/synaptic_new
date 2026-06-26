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

  const avgD = items.reduce((s, it) => s + (it.transform[3] ?? 1), 0) / items.length;
  const ySort: 'asc' | 'desc' = avgD > 0 ? 'desc' : 'asc';

  const sortedByY = [...withCoords].sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));
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
  lines.sort((a, b) => (ySort === 'desc' ? b.y - a.y : a.y - b.y));
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
    const columnLines: string[][] = columns.map(() => []);
    for (const line of lines) {
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci]!;
        const colItems = line.items.filter((it) => {
          const mid = it.x + it.width / 2;
          return mid >= col.minX - columnGap && mid <= col.maxX + columnGap;
        });
        if (colItems.length > 0) {
          columnLines[ci]!.push(colItems.map((it) => it.str).join(' '));
        }
      }
    }
    return columnLines
      .map((colBlock) => colBlock.join('\n'))
      .filter((block) => block.trim().length > 0)
      .join('\n\n');
  }

  return lines
    .map((line) => line.items.map((it) => it.str).join(' '))
    .join('\n');
}

describe('pdfExtract layout-aware reconstruction', () => {
  it('preserves single-column reading order', () => {
    const items: MockItem[] = [
      makeItem('First', 50, 200),
      makeItem('sentence.', 90, 200),
      makeItem('Second', 50, 180),
      makeItem('line.', 100, 180),
    ];
    const text = reconstructText(items, 600);
    expect(text).toContain('First sentence.');
    expect(text).toContain('Second line.');
  });

  it('reads multi-column text column-major (left then right)', () => {
    const pageWidth = 600;
    const items: MockItem[] = [
      makeItem('Left', 50, 200, 50),
      makeItem('column', 110, 200, 60),
      makeItem('Right', 350, 200, 60),
      makeItem('column', 420, 200, 60),
      makeItem('Next', 50, 180, 50),
      makeItem('row', 110, 180, 40),
      makeItem('Far', 350, 180, 50),
      makeItem('side', 410, 180, 50),
    ];
    const text = reconstructText(items, pageWidth);
    expect(text).toMatch(/Left column[\s\S]*Next row/);
    expect(text).toMatch(/Right column[\s\S]*Far side/);
    const leftIdx = text.indexOf('Left column');
    const rightIdx = text.indexOf('Right column');
    expect(leftIdx).toBeLessThan(rightIdx);
  });

  it('sorts items left-to-right on the same line', () => {
    const items: MockItem[] = [
      makeItem('world', 120, 200),
      makeItem('Hello', 50, 200),
    ];
    const text = reconstructText(items, 600);
    expect(text).toBe('Hello world');
  });

  it('reads Greek PDF pages top-to-bottom (native y-up, d>0)', () => {
    const items: MockItem[] = [
      makeItem('Θεμελιώδη', 50, 734, 80),
      makeItem('Θεωρήματα', 140, 734, 80),
      makeItem('Page 1', 50, 10, 40),
    ];
    const text = reconstructText(items, 600);
    expect(text.indexOf('Θεμελιώδη')).toBeLessThan(text.indexOf('Page 1'));
  });
});
