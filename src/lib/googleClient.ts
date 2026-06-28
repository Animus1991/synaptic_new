import type { UserSettings } from '../types';

export type GoogleConnectionStatus = {
  connected: boolean;
  email?: string;
  scopes: string[];
  hasTasks: boolean;
  hasMeet: boolean;
};

export type GoogleTaskList = {
  id?: string;
  title?: string;
};

export type GoogleTask = {
  id?: string;
  title?: string;
  notes?: string;
  status?: string;
};

export type GoogleMeetSpace = {
  meetingUri?: string;
  meetingCode?: string;
  name?: string;
};

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

export function googleAuthStartUrl(
  settings: UserSettings,
  mode: 'signin' | 'connect',
  returnTo?: string,
): string {
  const base = proxyBase(settings);
  const params = new URLSearchParams({ mode });
  if (returnTo) params.set('returnTo', returnTo);
  return `${base}/auth/google/start?${params.toString()}`;
}

export function googleConnectStartUrl(settings: UserSettings, token: string, returnTo?: string): string {
  const base = proxyBase(settings);
  const params = new URLSearchParams({
    mode: 'connect',
    synapse_token: token,
  });
  if (returnTo) params.set('returnTo', returnTo);
  return `${base}/auth/google/start?${params.toString()}`;
}

export async function completeGoogleAuth(
  code: string,
  settings: UserSettings,
): Promise<{ token: string; refreshToken?: string; email: string; plan?: string }> {
  const res = await fetch(`${proxyBase(settings)}/auth/google/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    account?: { email?: string; plan?: string };
  };
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    email: data.account?.email ?? '',
    plan: data.account?.plan,
  };
}

export async function fetchGoogleStatus(
  token: string,
  settings: UserSettings,
): Promise<GoogleConnectionStatus> {
  const res = await fetch(`${proxyBase(settings)}/auth/google/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as GoogleConnectionStatus;
}

export async function disconnectGoogle(token: string, settings: UserSettings): Promise<void> {
  const res = await fetch(`${proxyBase(settings)}/auth/google/disconnect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function listGoogleTaskLists(
  token: string,
  settings: UserSettings,
): Promise<GoogleTaskList[]> {
  const res = await fetch(`${proxyBase(settings)}/v1/google/tasks/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { lists?: GoogleTaskList[] };
  return data.lists ?? [];
}

export async function listGoogleTasks(
  token: string,
  settings: UserSettings,
  listId = '@default',
): Promise<GoogleTask[]> {
  const res = await fetch(
    `${proxyBase(settings)}/v1/google/tasks?listId=${encodeURIComponent(listId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { tasks?: GoogleTask[] };
  return data.tasks ?? [];
}

export async function createGoogleTask(
  token: string,
  settings: UserSettings,
  title: string,
  notes?: string,
  listId = '@default',
): Promise<GoogleTask> {
  const res = await fetch(`${proxyBase(settings)}/v1/google/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, notes, listId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as GoogleTask;
}

export async function createGoogleMeetSpace(
  token: string,
  settings: UserSettings,
): Promise<GoogleMeetSpace> {
  const res = await fetch(`${proxyBase(settings)}/v1/google/meet/spaces`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as GoogleMeetSpace;
}

/** Strip Google OAuth query params after handling redirect. */
export function clearGoogleAuthQueryParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const keys = ['google_auth_code', 'google', 'reason'];
  let changed = false;
  for (const k of keys) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
  }
}
