import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { getStudyRoom } from '../store/studyRoomStore';

const docSnapshots = new Map<string, Uint8Array>();

export function studyRoomDocumentName(roomId: string): string {
  return `study-room-${roomId}`;
}

function parseRoomId(documentName: string): string | null {
  const prefix = 'study-room-';
  if (!documentName.startsWith(prefix)) return null;
  const roomId = documentName.slice(prefix.length).trim();
  return roomId || null;
}

/** In-memory Yjs persistence for study-room shared notes (v1). */
export function startStudyRoomCollab(port: number): Server {
  const server = new Server({
    port,
    quiet: true,
    async onAuthenticate({ documentName, token }) {
      const roomId = parseRoomId(documentName);
      if (!roomId) {
        throw new Error('Invalid document name');
      }
      const room = getStudyRoom(roomId);
      if (!room) {
        throw new Error('Study room not found');
      }
      const invite = typeof token === 'string' ? token.trim() : '';
      if (!invite || invite !== room.inviteCode) {
        throw new Error('Invalid study room invite');
      }
    },
    async onLoadDocument({ document, documentName }) {
      const snap = docSnapshots.get(documentName);
      if (snap) {
        Y.applyUpdate(document, snap);
      }
    },
    async onStoreDocument({ document, documentName }) {
      docSnapshots.set(documentName, Y.encodeStateAsUpdate(document));
    },
  });

  void server.listen(port, () => {
    console.log(`[synapse-collab] Yjs/Hocuspocus on ws://localhost:${port}`);
  });

  return server;
}
