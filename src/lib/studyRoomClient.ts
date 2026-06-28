import type { UserSettings } from '../types';
import { apiUrl } from './apiBase';
import {
  localCreateRoom,
  localGetByInvite,
  localJoin,
  localPresence,
  subscribeLocalRoom,
  type LocalStudyRoomSnapshot,
} from './localStudyRoomBridge';

export type StudyRoomSnapshot = {
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
  localOnly?: boolean;
};

export type StudyRoomApiStatus = {
  ok: boolean;
  studyRooms?: boolean;
  localFallback?: boolean;
};

let preferLocal = false;

export function isLocalStudyRoomMode(): boolean {
  return preferLocal;
}

export function jitsiMeetDomain(): string {
  const fromEnv = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined)?.trim();
  return fromEnv || 'meet.jit.si';
}

export function jitsiMeetUrl(roomName: string): string {
  const domain = jitsiMeetDomain();
  const encoded = encodeURIComponent(roomName);
  return `https://${domain}/${encoded}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=false`;
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /failed to fetch|network/i.test(err.message));
}

export async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json.error) return json.error;
  } catch {
    /* plain text */
  }
  if (res.status === 404) return 'Study rooms API not found — restart the Synapse server (port 8787).';
  if (res.status >= 500) return 'Server error — try again in a moment.';
  return text || `Request failed (${res.status})`;
}

export async function checkStudyRoomApi(settings?: UserSettings): Promise<StudyRoomApiStatus> {
  try {
    const res = await fetch(apiUrl('/health', settings));
    if (!res.ok) return { ok: false, localFallback: true };
    const data = (await res.json()) as { ok?: boolean; features?: { studyRooms?: boolean } };
    preferLocal = false;
    return { ok: Boolean(data.ok), studyRooms: data.features?.studyRooms !== false };
  } catch {
    preferLocal = true;
    return { ok: false, localFallback: true };
  }
}

async function apiFetch(
  path: string,
  settings: UserSettings | undefined,
  init?: RequestInit,
): Promise<Response> {
  return fetch(apiUrl(path, settings), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

export async function createStudyRoom(
  courseId: string,
  name: string,
  settings?: UserSettings,
): Promise<StudyRoomSnapshot> {
  if (preferLocal) {
    return { ...localCreateRoom(courseId, name), localOnly: true };
  }
  try {
    const res = await apiFetch('/v1/study-rooms', settings, {
      method: 'POST',
      body: JSON.stringify({ courseId, name }),
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    preferLocal = false;
    return (await res.json()) as StudyRoomSnapshot;
  } catch (err) {
    if (isNetworkError(err)) {
      preferLocal = true;
      return { ...localCreateRoom(courseId, name), localOnly: true };
    }
    throw err;
  }
}

export async function joinStudyRoom(
  roomId: string,
  displayName: string,
  settings?: UserSettings,
  memberId?: string,
): Promise<{ room: StudyRoomSnapshot; memberId: string }> {
  if (preferLocal) {
    const result = localJoin(roomId, displayName, memberId);
    if (!result) throw new Error('Room not found');
    return { room: { ...result.room, localOnly: true }, memberId: result.memberId };
  }
  try {
    const res = await apiFetch(`/v1/study-rooms/${roomId}/join`, settings, {
      method: 'POST',
      body: JSON.stringify({ displayName, memberId }),
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return (await res.json()) as { room: StudyRoomSnapshot; memberId: string };
  } catch (err) {
    if (isNetworkError(err)) {
      preferLocal = true;
      const result = localJoin(roomId, displayName, memberId);
      if (!result) throw new Error('Room not found');
      return { room: { ...result.room, localOnly: true }, memberId: result.memberId };
    }
    throw err;
  }
}

export async function createAndJoinStudyRoom(
  courseId: string,
  name: string,
  displayName: string,
  settings?: UserSettings,
): Promise<{ room: StudyRoomSnapshot; memberId: string }> {
  const created = await createStudyRoom(courseId, name, settings);
  return joinStudyRoom(created.id, displayName, settings);
}

export async function joinStudyRoomByInvite(
  inviteCode: string,
  displayName: string,
  settings?: UserSettings,
  memberId?: string,
): Promise<{ room: StudyRoomSnapshot; memberId: string }> {
  if (preferLocal) {
    const room = localGetByInvite(inviteCode);
    if (!room) throw new Error('Room not found');
    const result = localJoin(room.id, displayName, memberId);
    if (!result) throw new Error('Room not found');
    return { room: { ...result.room, localOnly: true }, memberId: result.memberId };
  }
  try {
    const lookup = await apiFetch(`/v1/study-rooms/invite/${encodeURIComponent(inviteCode)}`, settings);
    if (!lookup.ok) throw new Error(await parseApiError(lookup));
    const room = (await lookup.json()) as StudyRoomSnapshot;
    return joinStudyRoom(room.id, displayName, settings, memberId);
  } catch (err) {
    if (isNetworkError(err)) {
      preferLocal = true;
      const room = localGetByInvite(inviteCode);
      if (!room) throw new Error('Room not found');
      const result = localJoin(room.id, displayName, memberId);
      if (!result) throw new Error('Room not found');
      return { room: { ...result.room, localOnly: true }, memberId: result.memberId };
    }
    throw err;
  }
}

export async function updateStudyRoomPresence(
  roomId: string,
  memberId: string,
  patch: { tool?: string; concept?: string; cursorX?: number; cursorY?: number; heartbeat?: boolean },
  settings?: UserSettings,
): Promise<StudyRoomSnapshot> {
  if (preferLocal) {
    const room = localPresence(roomId, memberId, patch);
    if (!room) throw new Error('Room or member not found');
    return { ...room, localOnly: true };
  }
  try {
    const res = await apiFetch(`/v1/study-rooms/${roomId}/presence`, settings, {
      method: 'POST',
      body: JSON.stringify({ memberId, ...patch }),
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return (await res.json()) as StudyRoomSnapshot;
  } catch (err) {
    if (isNetworkError(err)) {
      preferLocal = true;
      const room = localPresence(roomId, memberId, patch);
      if (!room) throw new Error('Room or member not found');
      return { ...room, localOnly: true };
    }
    throw err;
  }
}

export function subscribeStudyRoomStream(
  roomId: string,
  settings: UserSettings | undefined,
  onSnapshot: (room: StudyRoomSnapshot) => void,
): () => void {
  if (preferLocal) {
    return subscribeLocalRoom(roomId, (room: LocalStudyRoomSnapshot) => {
      onSnapshot({ ...room, localOnly: true });
    });
  }
  const url = apiUrl(`/v1/study-rooms/${roomId}/stream`, settings);
  let es: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    es?.close();
    es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        onSnapshot(JSON.parse(ev.data) as StudyRoomSnapshot);
      } catch {
        /* ignore malformed */
      }
    };
    es.onerror = () => {
      es?.close();
      if (!closed) retryTimer = setTimeout(connect, 3000);
    };
  };
  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    es?.close();
  };
}

const STORAGE_KEY = 'synapse-study-room-session';

export type LocalStudyRoomSession = {
  roomId: string;
  memberId: string;
  inviteCode: string;
  localOnly?: boolean;
};

export function loadStudyRoomSession(): LocalStudyRoomSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalStudyRoomSession;
  } catch {
    return null;
  }
}

export function saveStudyRoomSession(session: LocalStudyRoomSession | null): void {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
