import { describe, expect, it } from 'vitest';
import {
  buildWhiteboardSvg,
  layeredStrokeToSvg,
  sanitizeWhiteboardFilename,
} from './whiteboardExport';
import type { WhiteboardDocument } from './whiteboardLayers';

const doc: WhiteboardDocument = {
  version: 2,
  activeLayerId: 'layer-main',
  layers: [
    { id: 'layer-main', name: 'Main', visible: true, locked: false },
    { id: 'layer-hidden', name: 'Hidden', visible: false, locked: false },
  ],
  strokes: [
    {
      layerId: 'layer-main',
      tool: 'pen',
      color: '#67e8f9',
      width: 3,
      points: [{ x: 10, y: 20 }, { x: 40, y: 50 }],
    },
    {
      layerId: 'layer-main',
      tool: 'text',
      color: '#f8fafc',
      width: 2,
      points: [{ x: 80, y: 90 }],
      text: 'Supply & Demand',
    },
    {
      layerId: 'layer-hidden',
      tool: 'pen',
      color: '#f87171',
      width: 2,
      points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
    },
    {
      layerId: 'layer-main',
      tool: 'eraser',
      color: '#000',
      width: 8,
      points: [{ x: 5, y: 5 }, { x: 15, y: 15 }],
    },
  ],
};

describe('whiteboardExport', () => {
  it('sanitizes filenames', () => {
    expect(sanitizeWhiteboardFilename('whiteboard demo/board')).toBe('whiteboard-demo-board');
  });

  it('renders pen and text strokes to SVG primitives', () => {
    const pen = layeredStrokeToSvg(doc.strokes[0]!);
    expect(pen).toContain('<polyline');
    expect(pen).toContain('#67e8f9');

    const text = layeredStrokeToSvg(doc.strokes[1]!);
    expect(text).toContain('<text');
    expect(text).toContain('Supply &amp; Demand');
  });

  it('skips eraser strokes', () => {
    expect(layeredStrokeToSvg(doc.strokes[3]!)).toBe('');
  });

  it('builds document SVG with visible layers only', () => {
    const svg = buildWhiteboardSvg(doc, { width: 640, height: 420, background: '#0f172a' });
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain('viewBox="0 0 640 420"');
    expect(svg).toContain('#67e8f9');
    expect(svg).not.toContain('#f87171');
  });

  it('renders arrow heads', () => {
    const arrow = layeredStrokeToSvg({
      layerId: 'layer-main',
      tool: 'arrow',
      color: '#a78bfa',
      width: 2,
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    });
    expect(arrow).toContain('<line');
    expect(arrow).toContain('<polyline');
  });
});
