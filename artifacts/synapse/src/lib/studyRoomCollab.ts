import type { UserSettings } from '../types';
import { apiUrl } from './apiBase';

export const STUDY_ROOM_NOTES_FIELD = 'notes';

export function studyRoomDocumentName(roomId: string): string {
  return `study-room-${roomId}`;
}

/** Resolve collab WebSocket URL from /health or proxy base (port + 1). */
export function resolveCollabWebSocketUrl(
  settings: UserSettings | undefined,
  healthUrl?: string,
): string | null {
  const raw = healthUrl?.trim();
  if (raw) {
    if (typeof window === 'undefined') return raw;
    try {
      const u = new URL(raw);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        u.hostname = window.location.hostname;
      }
      return u.toString();
    } catch {
      return raw;
    }
  }

  try {
    const httpBase = apiUrl('/health', settings);
    const u = new URL(httpBase);
    const port = u.port ? Number(u.port) + 1 : 8788;
    u.port = String(port);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/';
    u.search = '';
    u.hash = '';
    if (typeof window !== 'undefined' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      u.hostname = window.location.hostname;
    }
    return u.toString();
  } catch {
    return null;
  }
}
