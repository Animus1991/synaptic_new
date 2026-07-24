/** Yjs/Hocuspocus document id for a shared whiteboard in a study room. */
export function whiteboardDocumentName(roomId: string, conceptKey: string): string {
  return `whiteboard-${roomId}__${encodeURIComponent(conceptKey)}`;
}

export type WhiteboardCollabConfig = {
  roomId: string;
  inviteCode: string;
  wsUrl: string;
  conceptKey: string;
};
