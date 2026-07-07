/** Yjs/Hocuspocus document id for a shared concept map in a study room. */
export function conceptMapDocumentName(roomId: string, conceptKey: string): string {
  return `concept-map-${roomId}__${encodeURIComponent(conceptKey)}`;
}

export function parseConceptMapDocumentName(documentName: string): { roomId: string; conceptKey: string } | null {
  if (!documentName.startsWith('concept-map-')) return null;
  const body = documentName.slice('concept-map-'.length);
  const sep = body.indexOf('__');
  if (sep <= 0) return null;
  try {
    return {
      roomId: body.slice(0, sep),
      conceptKey: decodeURIComponent(body.slice(sep + 2)),
    };
  } catch {
    return null;
  }
}

export type ConceptMapCollabConfig = {
  roomId: string;
  inviteCode: string;
  wsUrl: string;
  conceptKey: string;
};
