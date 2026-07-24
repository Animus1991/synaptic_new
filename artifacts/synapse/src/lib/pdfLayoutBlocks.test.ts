import { describe, expect, it } from 'vitest';
import { documentBlocksFromPdfLayout } from './documentModel';
import { extractLayoutBlocksFromPage } from './pdfLayoutBlocks';

function fakeItem(str: string, x: number, y: number, height = 12) {
  return {
    str,
    transform: [height, 0, 0, height, x, y],
    width: str.length * 6,
    height,
    fontName: 'f1',
  };
}

describe('extractLayoutBlocksFromPage', () => {
  it('detects heading, paragraph, list, and equation blocks', () => {
    const items = [
      fakeItem('Chapter 1', 72, 700, 22),
      fakeItem('Intro paragraph one.', 72, 660, 12),
      fakeItem('Intro paragraph two.', 72, 640, 12),
      fakeItem('• First bullet item', 72, 600, 12),
      fakeItem('E = mc^2', 72, 560, 12),
    ];
    const styles = { f1: { fontFamily: 'Arial' } };
    const pageText = [
      'Chapter 1',
      'Intro paragraph one.',
      'Intro paragraph two.',
      '• First bullet item',
      'E = mc^2',
    ].join('\n');

    const blocks = extractLayoutBlocksFromPage(items, styles, 800, pageText, 0, 0);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    expect(blocks.some((b) => b.type === 'heading')).toBe(true);
    expect(blocks.some((b) => b.type === 'list')).toBe(true);
    expect(blocks.some((b) => b.type === 'equation')).toBe(true);
    expect(blocks[0]!.charStart).toBe(0);
    expect(blocks.every((b) => b.charEnd > b.charStart)).toBe(true);
  });
});

describe('documentBlocksFromPdfLayout', () => {
  it('maps pdf blocks to sections by char offset', () => {
    const sections = [
      {
        id: 'sec_0',
        heading: 'Chapter 1',
        text: 'Body text here.',
        charStart: 0,
        charEnd: 40,
        level: 1,
        index: 0,
        sentenceIds: [],
        parentId: null,
        role: 'body' as const,
      },
    ];
    const blocks = documentBlocksFromPdfLayout(
      [
        { type: 'heading', text: 'Chapter 1', charStart: 0, charEnd: 9, pageIndex: 0 },
        { type: 'paragraph', text: 'Body text here.', charStart: 10, charEnd: 25, pageIndex: 0 },
      ],
      sections,
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.sectionId).toBe('sec_0');
    expect(blocks[1]!.type).toBe('paragraph');
  });
});
