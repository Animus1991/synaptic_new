/**
 * Same-browser fallback when the proxy is unreachable (dev without server).
 * Syncs via BroadcastChannel — not cross-device; server remains the primary path.
 */

function randomUUID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type LocalStudyRoomSnapshot = {
  id: string;
  courseId: string;
  name: string;
  inviteCode: string;
  jitsiRoom: string;
  members: {
    id: string;
    displayName: string;
    tool?: string;
    concept?: string;
    cursorX?: number;
    cursorY?: number;
    lastSeen: number;
  }[];
  sharedTool?: string;
  sharedConcept?: string;
  whiteboardVersion?: number;
  version: number;
  createdAt: string;
};

const CHANNEL = 'synapse-local-study-room';
const rooms = new Map<string, LocalStudyRoomSnapshot>();
const byInvite = new Map<string, string>();

function slugInvite(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

function jitsiSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return `synapse-${base || 'room'}-${slugInvite().slice(0, 6)}`;
}

function emit(room: LocalStudyRoomSnapshot): void {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: 'room', room });
    bc.close();
  } catch {
    /* BroadcastChannel optional */
  }
}

if (typeof window !== 'undefined') {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev: MessageEvent<{ type: string; room: LocalStudyRoomSnapshot }>) => {
      if (ev.data?.type === 'room' && ev.data.room?.id) {
        rooms.set(ev.data.room.id, ev.data.room);
        byInvite.set(ev.data.room.inviteCode.toLowerCase(), ev.data.room.id);
      }
    };
  } catch {
    /* ignore */
  }
}

export function localCreateRoom(courseId: string, name: string): LocalStudyRoomSnapshot {
  const id = randomUUID();
  let inviteCode = slugInvite();
  while (byInvite.has(inviteCode)) inviteCode = slugInvite();
  const room: LocalStudyRoomSnapshot = {
    id,
    courseId,
    name: name.trim() || 'Study room',
    inviteCode,
    jitsiRoom: jitsiSlug(name),
    members: [],
    version: 1,
    createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  byInvite.set(inviteCode.toLowerCase(), id);
  emit(room);
  return room;
}

export function localGetByInvite(code: string): LocalStudyRoomSnapshot | undefined {
  const id = byInvite.get(code.trim().toLowerCase());
  return id ? rooms.get(id) : undefined;
}

export function localJoin(
  roomId: string,
  displayName: string,
  memberId?: string,
): { room: LocalStudyRoomSnapshot; memberId: string } | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const id = memberId && room.members.some((m) => m.id === memberId) ? memberId : randomUUID();
  const next = {
    ...room,
    members: [
      ...room.members.filter((m) => m.id !== id),
      {
        id,
        displayName: displayName.trim() || 'Learner',
        tool: room.sharedTool,
        concept: room.sharedConcept,
        lastSeen: Date.now(),
      },
    ],
    version: room.version + 1,
  };
  rooms.set(roomId, next);
  emit(next);
  return { room: next, memberId: id };
}

export function localPresence(
  roomId: string,
  memberId: string,
  patch: { tool?: string; concept?: string; cursorX?: number; cursorY?: number },
): LocalStudyRoomSnapshot | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const members = room.members.map((m) => {
    if (m.id !== memberId) return m;
    return {
      ...m,
      ...patch,
      lastSeen: Date.now(),
    };
  });
  const next: LocalStudyRoomSnapshot = {
    ...room,
    members,
    sharedTool: patch.tool ?? room.sharedTool,
    sharedConcept: patch.concept ?? room.sharedConcept,
    version: room.version + 1,
  };
  rooms.set(roomId, next);
  emit(next);
  return next;
}

export function subscribeLocalRoom(roomId: string, onRoom: (room: LocalStudyRoomSnapshot) => void): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev: MessageEvent<{ type: string; room: LocalStudyRoomSnapshot }>) => {
      if (ev.data?.room?.id === roomId) onRoom(ev.data.room);
    };
  } catch {
    /* ignore */
  }
  const snap = rooms.get(roomId);
  if (snap) onRoom(snap);
  return () => bc?.close();
}
