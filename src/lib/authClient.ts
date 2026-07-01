import type { UserSettings } from '../types';
import type { OcrStoredRegion } from './readerOcrOverlay';
import type { TeacherDashboardResponse } from './teacherDashboardTypes';
import type {
  AssignmentRow,
  AssignmentsResponse,
  ClassEnrollmentRow,
  ClassRosterResponse,
  TeacherClassRow,
  TeacherClassesResponse,
} from './teacherClassTypes';

export type AuthSession = {
  token: string;
  refreshToken?: string;
  email: string;
  plan?: 'free' | 'pro' | 'team';
};

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

/** Proxy URL only when the user explicitly configured one — never implicit localhost. */
export function configuredProxyBase(settings?: UserSettings): string | null {
  const raw = settings?.authProxyBase?.trim() || settings?.llmProxyUrl?.trim();
  if (!raw) return null;
  return raw.replace(/\/v1\/?$/, '').replace(/\/$/, '');
}

export function isProxyConfigured(settings?: UserSettings): boolean {
  return configuredProxyBase(settings) != null;
}

export async function authRegister(
  email: string,
  password: string,
  settings: UserSettings,
): Promise<AuthSession> {
  const res = await fetch(`${proxyBase(settings)}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    email?: string;
    plan?: string;
    account?: { email?: string; plan?: string };
  };
  const plan = (data.plan ?? data.account?.plan) as AuthSession['plan'];
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    email: data.email ?? data.account?.email ?? email,
    plan: plan ?? 'free',
  };
}

export async function authLogin(
  email: string,
  password: string,
  settings: UserSettings,
): Promise<AuthSession> {
  const res = await fetch(`${proxyBase(settings)}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    email?: string;
    plan?: string;
    account?: { email?: string; plan?: string };
  };
  const plan = (data.plan ?? data.account?.plan) as AuthSession['plan'];
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    email: data.email ?? data.account?.email ?? email,
    plan: plan ?? 'free',
  };
}

export async function authMe(
  token: string,
  settings: UserSettings,
): Promise<{ email: string; plan: 'free' | 'pro' | 'team' }> {
  const res = await fetch(`${proxyBase(settings)}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { account?: { email?: string; plan?: string } };
  return {
    email: data.account?.email ?? '',
    plan: (data.account?.plan as 'free' | 'pro' | 'team') ?? 'free',
  };
}

export type RemoteLibrary = {
  uploadedFiles: unknown[];
  glossaryEntries: unknown[];
  generatedCourses: unknown[];
  updatedAt: string;
};

export async function fetchRemoteLibrary(token: string, settings: UserSettings): Promise<RemoteLibrary> {
  const res = await fetch(`${proxyBase(settings)}/v1/library`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<RemoteLibrary>;
}

export async function pushRemoteLibrary(
  token: string,
  settings: UserSettings,
  library: Omit<RemoteLibrary, 'updatedAt'>,
): Promise<RemoteLibrary> {
  const res = await fetch(`${proxyBase(settings)}/v1/library`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(library),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<RemoteLibrary>;
}

export type RemoteSession = {
  learnerModel: unknown;
  dashboardStats: unknown;
  tasks: unknown[];
  xp: number;
  betaMastery: unknown[];
  firstAttemptKeys: string[];
  openMistakes: unknown[];
  activities: unknown[];
  userSettings: unknown;
  conceptBuses?: Record<string, unknown>;
  stepSchedules?: Record<string, unknown>;
  updatedAt: string;
};

export async function fetchRemoteSession(token: string, settings: UserSettings): Promise<RemoteSession> {
  const res = await fetch(`${proxyBase(settings)}/v1/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<RemoteSession>;
}

export async function pushRemoteSession(
  token: string,
  settings: UserSettings,
  session: Omit<RemoteSession, 'updatedAt'>,
): Promise<RemoteSession> {
  const res = await fetch(`${proxyBase(settings)}/v1/session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<RemoteSession>;
}

export async function createCheckoutSession(
  token: string,
  settings: UserSettings,
  plan: 'pro' | 'team',
  urls?: { successUrl?: string; cancelUrl?: string },
): Promise<{ url: string | null; sessionId: string }> {
  const res = await fetch(`${proxyBase(settings)}/v1/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan, ...urls }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ url: string | null; sessionId: string }>;
}

export async function fetchBillingStatus(settings: UserSettings): Promise<{
  enabled: boolean;
  webhookConfigured: boolean;
  plans: string[];
}> {
  const res = await fetch(`${proxyBase(settings)}/v1/billing/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ enabled: boolean; webhookConfigured: boolean; plans: string[] }>;
}

export async function authRefresh(
  refreshToken: string,
  settings: UserSettings,
): Promise<{ token: string; refreshToken?: string }> {
  const res = await fetch(`${proxyBase(settings)}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { token: string; refreshToken?: string };
  return { token: data.token, refreshToken: data.refreshToken };
}

export async function authForgotPassword(
  email: string,
  settings: UserSettings,
): Promise<{ ok: boolean; resetToken?: string }> {
  const res = await fetch(`${proxyBase(settings)}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; resetToken?: string }>;
}


export async function fetchTeacherDashboard(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TeacherDashboardResponse>;
}

export async function fetchTeacherClasses(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TeacherClassesResponse>;
}

export async function createTeacherClass(
  token: string,
  settings: UserSettings,
  payload: { name: string; courseId?: string },
): Promise<TeacherClassRow> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TeacherClassRow>;
}

export async function fetchClassRoster(
  token: string,
  settings: UserSettings,
  classId: string,
): Promise<ClassRosterResponse> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes/${classId}/roster`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ClassRosterResponse>;
}

export async function addClassEnrollment(
  token: string,
  settings: UserSettings,
  classId: string,
  payload: { email: string; displayName?: string; mastery?: number },
): Promise<ClassEnrollmentRow> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes/${classId}/roster`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ClassEnrollmentRow>;
}

export async function removeClassEnrollment(
  token: string,
  settings: UserSettings,
  classId: string,
  enrollmentId: string,
): Promise<void> {
  const res = await fetch(
    `${proxyBase(settings)}/v1/teacher/classes/${classId}/roster/${enrollmentId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function fetchClassAssignments(
  token: string,
  settings: UserSettings,
  classId: string,
): Promise<AssignmentsResponse> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes/${classId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AssignmentsResponse>;
}

export async function createClassAssignment(
  token: string,
  settings: UserSettings,
  classId: string,
  payload: { title: string; description?: string; dueAt?: string; courseId?: string },
): Promise<AssignmentRow> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes/${classId}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AssignmentRow>;
}

export async function removeClassAssignment(
  token: string,
  settings: UserSettings,
  classId: string,
  assignmentId: string,
): Promise<void> {
  const res = await fetch(
    `${proxyBase(settings)}/v1/teacher/classes/${classId}/assignments/${assignmentId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function ocrPages(
  token: string | undefined,
  settings: UserSettings,
  pages: string[],
  pageCount?: number,
  languages = 'eng+ell',
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  const res = await fetch(`${proxyBase(settings)}/v1/ocr/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pages, pageCount, languages }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    text: string;
    pageCount: number;
    ocrUsed: boolean;
    regions?: OcrStoredRegion[];
    modelsUsed?: string[];
  }>;
}

export async function ragQuery(
  token: string | undefined,
  settings: UserSettings,
  query: string,
  chunks: { id: string; text: string }[],
  topK = 5,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  const res = await fetch(`${proxyBase(settings)}/v1/rag/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, chunks, topK }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ results: { id: string; text: string; score: number }[] }>;
}

export type GlobalRagHit = {
  id: string;
  text: string;
  score: number;
  fileId: string;
  fileName: string;
  charStart: number;
  charEnd: number;
  heading?: string;
  page?: number;
  graphBoost?: number;
  matchedConcepts?: string[];
};

export async function ragSearch(
  token: string | undefined,
  settings: UserSettings,
  query: string,
  opts: { topK?: number; courseId?: string; graph?: boolean } = {},
): Promise<{ results: GlobalRagHit[]; indexedChunks: number; global: boolean; graphRag?: boolean }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  const res = await fetch(`${proxyBase(settings)}/v1/rag/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      topK: opts.topK ?? 5,
      courseId: opts.courseId,
      graph: opts.graph !== false,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ results: GlobalRagHit[]; indexedChunks: number; global: boolean; graphRag?: boolean }>;
}

export async function ragIndexLibrary(
  token: string,
  settings: UserSettings,
  library: { uploadedFiles: unknown[]; glossaryEntries: unknown[]; generatedCourses: unknown[] },
): Promise<{ indexedChunks: number }> {
  const res = await fetch(`${proxyBase(settings)}/v1/rag/index`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(library),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ indexedChunks: number }>;
}

export type SharedAnnotationDto = {
  id: string;
  courseId: string;
  fileKey: string;
  type: 'highlight' | 'comment' | 'pin';
  text: string;
  color: string;
  lineStart: number;
  lineEnd: number;
  focusTerm?: string;
  teacherEmail: string;
  createdAt: string;
};

export type SharedAnnotationSyncResult = {
  annotations: SharedAnnotationDto[];
  version: number;
  serverTime: string;
  /** False when no proxy is configured or the server could not be reached. */
  reachable?: boolean;
};

export async function fetchSharedAnnotations(
  settings: UserSettings,
  courseId: string,
  fileKey: string,
  opts?: { since?: string },
): Promise<SharedAnnotationSyncResult> {
  const base = configuredProxyBase(settings);
  if (!base) {
    return { annotations: [], version: 0, serverTime: new Date().toISOString(), reachable: false };
  }
  try {
    const params = new URLSearchParams({ courseId, fileKey });
    if (opts?.since) params.set('since', opts.since);
    const res = await fetch(`${base}/v1/annotations/shared?${params.toString()}`);
    if (!res.ok) {
      return { annotations: [], version: 0, serverTime: new Date().toISOString(), reachable: false };
    }
    const data = (await res.json()) as SharedAnnotationSyncResult;
    return {
      annotations: data.annotations ?? [],
      version: data.version ?? 0,
      serverTime: data.serverTime ?? new Date().toISOString(),
      reachable: true,
    };
  } catch {
    return { annotations: [], version: 0, serverTime: new Date().toISOString(), reachable: false };
  }
}

export async function publishTeacherAnnotation(
  token: string,
  settings: UserSettings,
  payload: Omit<SharedAnnotationDto, 'id' | 'teacherEmail' | 'createdAt'>,
): Promise<SharedAnnotationDto | null> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json() as Promise<SharedAnnotationDto>;
}

export async function authExportAccount(token: string, settings: UserSettings): Promise<Blob> {
  const res = await fetch(`${proxyBase(settings)}/v1/account/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function authDeleteAccount(
  token: string,
  settings: UserSettings,
  confirmEmail: string,
): Promise<void> {
  const res = await fetch(`${proxyBase(settings)}/v1/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmEmail }),
  });
  if (!res.ok) throw new Error(await res.text());
}
