/** Server-side parsing for concept-map Yjs document names. */
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

export function resolveCollabRoomId(documentName: string): string | null {
  const prefix = 'study-room-';
  if (documentName.startsWith(prefix)) {
    const roomId = documentName.slice(prefix.length).trim();
    return roomId || null;
  }
  const concept = parseConceptMapDocumentName(documentName);
  return concept?.roomId ?? null;
}
