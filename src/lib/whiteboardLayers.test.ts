import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYER_ID,
  createDefaultLayers,
  isLayerLocked,
  migrateWhiteboardPayload,
  visibleStrokes,
} from './whiteboardLayers';

describe('whiteboardLayers', () => {
  it('migrates legacy stroke array to v2 document', () => {
    const doc = migrateWhiteboardPayload([
      { tool: 'pen', color: '#fff', width: 2, points: [{ x: 1, y: 2 }] },
    ]);
    expect(doc.version).toBe(2);
    expect(doc.layers.length).toBeGreaterThan(0);
    expect(doc.strokes[0]?.layerId).toBe(DEFAULT_LAYER_ID);
  });

  it('filters hidden layers from visible strokes', () => {
    const doc = migrateWhiteboardPayload([], 'en');
    const hiddenId = 'layer-hidden';
    doc.layers.push({ id: hiddenId, name: 'Hidden', visible: false, locked: false });
    doc.strokes.push({
      layerId: hiddenId,
      tool: 'pen',
      color: '#fff',
      width: 1,
      points: [{ x: 0, y: 0 }],
    });
    doc.strokes.push({
      layerId: DEFAULT_LAYER_ID,
      tool: 'pen',
      color: '#fff',
      width: 1,
      points: [{ x: 1, y: 1 }],
    });
    expect(visibleStrokes(doc)).toHaveLength(1);
    expect(visibleStrokes(doc)[0]?.layerId).toBe(DEFAULT_LAYER_ID);
  });

  it('reports layer lock state', () => {
    const layers = createDefaultLayers('en');
    layers[0]!.locked = true;
    const doc = migrateWhiteboardPayload([], 'en');
    doc.layers = layers;
    expect(isLayerLocked(doc, layers[0]!.id)).toBe(true);
    expect(isLayerLocked(doc, layers[1]!.id)).toBe(false);
  });
});
