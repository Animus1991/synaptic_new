import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { resolveCollabRoomId } from './documentNames';
import { getStudyRoom } from '../store/studyRoomStore';
import { createStudyRoomDocPgRepo, persistStudyRoomDoc } from '../store/studyRoomDocPgStore';

const docSnapshots = new Map<string, Uint8Array>();

export function studyRoomDocumentName(roomId: string): string {
  return `study-room-${roomId}`;
}

/** Yjs persistence: in-memory cache + optional Postgres (study_room_docs). */
export function startStudyRoomCollab(port: number, databaseUrl?: string): Server {
  const docRepo = databaseUrl?.trim() ? createStudyRoomDocPgRepo(databaseUrl) : null;

  const server = new Server({
    port,
    quiet: true,
    async onAuthenticate({ documentName, token }) {
      const roomId = resolveCollabRoomId(documentName);
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
      let snap = docSnapshots.get(documentName);
      if (!snap && docRepo) {
        snap = (await docRepo.loadDoc(documentName)) ?? undefined;
        if (snap) docSnapshots.set(documentName, snap);
      }
      if (snap) {
        Y.applyUpdate(document, snap);
      }
    },
    async onStoreDocument({ document, documentName }) {
      const update = Y.encodeStateAsUpdate(document);
      docSnapshots.set(documentName, update);
      if (docRepo) {
        persistStudyRoomDoc(databaseUrl, documentName, update);
      }
    },
  });

  void server.listen(port, () => {
    const store = docRepo ? 'Postgres + memory' : 'memory only';
    console.log(`[synapse-collab] Yjs/Hocuspocus on ws://localhost:${port} (${store})`);
  });

  return server;
}
