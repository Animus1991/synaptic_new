import * as Y from 'yjs';
import type { WhiteboardDocument } from './whiteboardLayers';
import { migrateWhiteboardPayload } from './whiteboardLayers';

export const WHITEBOARD_DOC_FIELD = 'doc';
export const WHITEBOARD_LOCAL_ORIGIN = 'whiteboard-local';

export function readWhiteboardDoc(doc: Y.Doc, lang: 'en' | 'el' = 'en'): WhiteboardDocument {
  const raw = doc.getMap<string>(WHITEBOARD_DOC_FIELD).get('json');
  if (!raw) return migrateWhiteboardPayload([], lang);
  try {
    return migrateWhiteboardPayload(JSON.parse(raw), lang);
  } catch {
    return migrateWhiteboardPayload([], lang);
  }
}

export function isWhiteboardDocEmpty(doc: Y.Doc): boolean {
  const y = doc.getMap(WHITEBOARD_DOC_FIELD);
  const raw = y.get('json');
  if (!raw || typeof raw !== 'string') return true;
  try {
    const parsed = JSON.parse(raw) as WhiteboardDocument;
    return !parsed.strokes?.length;
  } catch {
    return true;
  }
}

export function writeWhiteboardDoc(
  doc: Y.Doc,
  wb: WhiteboardDocument,
  origin: string | symbol = WHITEBOARD_LOCAL_ORIGIN,
): void {
  doc.transact(() => {
    const y = doc.getMap<string>(WHITEBOARD_DOC_FIELD);
    y.set('json', JSON.stringify(wb));
    y.set('rev', String(Date.now()));
  }, origin);
}

export function observeWhiteboardDoc(
  doc: Y.Doc,
  onChange: (wb: WhiteboardDocument) => void,
  lang: 'en' | 'el' = 'en',
): () => void {
  const y = doc.getMap(WHITEBOARD_DOC_FIELD);
  const notify = (_event: Y.YMapEvent<unknown>, transaction: Y.Transaction) => {
    if (transaction.origin === WHITEBOARD_LOCAL_ORIGIN) return;
    onChange(readWhiteboardDoc(doc, lang));
  };
  y.observe(notify);
  return () => y.unobserve(notify);
}
