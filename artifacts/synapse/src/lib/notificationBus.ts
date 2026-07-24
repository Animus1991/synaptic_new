export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  level: NotificationLevel;
  title: string;
  body?: string;
  createdAt: number;
  /** Screen-reader priority for aria-live region. */
  assertive?: boolean;
};

type Listener = (items: AppNotification[]) => void;

const MAX_VISIBLE = 5;
const DEFAULT_TTL_MS = 6000;

let seq = 0;
const items: AppNotification[] = [];
const listeners = new Set<Listener>();

function publish(): void {
  const snapshot = [...items];
  for (const fn of listeners) fn(snapshot);
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  listener([...items]);
  return () => listeners.delete(listener);
}

export function listNotifications(): AppNotification[] {
  return [...items];
}

export function dismissNotification(id: string): void {
  const idx = items.findIndex((n) => n.id === id);
  if (idx < 0) return;
  items.splice(idx, 1);
  publish();
}

export function clearNotifications(): void {
  items.length = 0;
  publish();
}

export function pushNotification(input: {
  level?: NotificationLevel;
  title: string;
  body?: string;
  ttlMs?: number;
  assertive?: boolean;
}): string {
  const id = `ntf-${++seq}-${Date.now()}`;
  const note: AppNotification = {
    id,
    level: input.level ?? 'info',
    title: input.title,
    body: input.body,
    createdAt: Date.now(),
    assertive: input.assertive ?? input.level === 'error',
  };
  items.unshift(note);
  while (items.length > MAX_VISIBLE) items.pop();
  publish();
  const ttl = input.ttlMs ?? DEFAULT_TTL_MS;
  if (ttl > 0 && typeof setTimeout !== 'undefined') {
    setTimeout(() => dismissNotification(id), ttl);
  }
  return id;
}

export function notifyInfo(title: string, body?: string): string {
  return pushNotification({ level: 'info', title, body });
}

export function notifySuccess(title: string, body?: string): string {
  return pushNotification({ level: 'success', title, body });
}

export function notifyWarning(title: string, body?: string): string {
  return pushNotification({ level: 'warning', title, body, assertive: true });
}

export function notifyError(title: string, body?: string): string {
  return pushNotification({ level: 'error', title, body, assertive: true });
}

/** Reset for unit tests. */
export function resetNotificationBusForTests(): void {
  items.length = 0;
  seq = 0;
  publish();
}

declare global {
  interface Window {
    __synapseTest?: {
      notifySuccess: typeof notifySuccess;
      notifyError: typeof notifyError;
      notifyWarning: typeof notifyWarning;
    };
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__synapseTest = { notifySuccess, notifyError, notifyWarning };
}
