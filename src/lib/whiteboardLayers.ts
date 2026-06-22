export type WhiteboardLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type LayeredStroke = {
  layerId: string;
  tool: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
  text?: string;
};

export type WhiteboardDocument = {
  version: 2;
  layers: WhiteboardLayer[];
  activeLayerId: string;
  strokes: LayeredStroke[];
};

export const DEFAULT_LAYER_ID = 'layer-main';

export function createDefaultLayers(lang: 'en' | 'el' = 'en'): WhiteboardLayer[] {
  return [
    { id: DEFAULT_LAYER_ID, name: lang === 'el' ? 'Κύριο' : 'Main', visible: true, locked: false },
    { id: 'layer-notes', name: lang === 'el' ? 'Σημειώσεις' : 'Notes', visible: true, locked: false },
  ];
}

export function migrateWhiteboardPayload(
  raw: unknown,
  lang: 'en' | 'el' = 'en',
): WhiteboardDocument {
  if (raw && typeof raw === 'object' && (raw as WhiteboardDocument).version === 2) {
    const doc = raw as WhiteboardDocument;
    return {
      version: 2,
      layers: doc.layers?.length ? doc.layers : createDefaultLayers(lang),
      activeLayerId: doc.activeLayerId || DEFAULT_LAYER_ID,
      strokes: doc.strokes ?? [],
    };
  }
  const legacy = (Array.isArray(raw) ? raw : []) as LayeredStroke[];
  return {
    version: 2,
    layers: createDefaultLayers(lang),
    activeLayerId: DEFAULT_LAYER_ID,
    strokes: legacy.map((s) => ({ ...s, layerId: s.layerId ?? DEFAULT_LAYER_ID })),
  };
}

export function visibleStrokes(doc: WhiteboardDocument): LayeredStroke[] {
  const hidden = new Set(doc.layers.filter((l) => !l.visible).map((l) => l.id));
  return doc.strokes.filter((s) => !hidden.has(s.layerId));
}

export function isLayerLocked(doc: WhiteboardDocument, layerId: string): boolean {
  return doc.layers.find((l) => l.id === layerId)?.locked ?? false;
}
