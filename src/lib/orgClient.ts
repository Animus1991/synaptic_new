import type { UserSettings } from '../types';

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export type OrgRow = { id: string; name: string; createdAt: string };
export type OrgMembershipRow = { id: string; orgId: string; accountId: string; role: string; createdAt: string };

export type OrgAnalytics = {
  orgId: string;
  classCount: number;
  totalStudents: number;
  totalAssignments: number;
  avgMastery: number | null;
  avgScore: number | null;
  completionRate: number | null;
  classes: {
    classId: string;
    name: string;
    studentCount: number;
    assignmentCount: number;
    avgMastery: number | null;
    avgScore: number | null;
    completionRate: number | null;
  }[];
  generatedAt: string;
};

export async function fetchOrgs(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/orgs`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { orgs: OrgRow[] };
}

export async function createOrg(token: string, settings: UserSettings, name: string) {
  const res = await fetch(`${proxyBase(settings)}/v1/orgs`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as OrgRow;
}

export async function fetchOrgAnalytics(token: string, settings: UserSettings, orgId: string) {
  const res = await fetch(`${proxyBase(settings)}/v1/orgs/${orgId}/analytics`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as OrgAnalytics;
}

export async function fetchOrgAuditLogs(
  token: string,
  settings: UserSettings,
  orgId: string,
  since?: string,
) {
  const url = new URL(`${proxyBase(settings)}/v1/orgs/${orgId}/audit-logs`);
  if (since) url.searchParams.set('since', since);
  const res = await fetch(url.toString(), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { orgId: string; logs: unknown[] };
}

export async function fetchStudentClasses(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/student/classes`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    email: string;
    classes: {
      class: { id: string; name: string; courseId?: string; orgId?: string };
      enrollment: { id: string; displayName?: string; mastery?: number };
      assignments: { id: string; title: string; dueAt?: string }[];
      gradeCells: { assignmentId: string; score?: number; status: string }[];
    }[];
  };
}

export async function fetchStudentOrgs(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/student/orgs`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    orgs: { org: OrgRow; membership: OrgMembershipRow | null }[];
  };
}

export async function ragSynthesize(
  token: string,
  settings: UserSettings,
  query: string,
  opts?: { courseIds?: string[]; lang?: 'en' | 'el' },
) {
  const res = await fetch(`${proxyBase(settings)}/v1/rag/synthesize`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ query, ...opts }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { synthesis: string; sources: unknown[]; courseIds: string[] };
}

export async function fetchRagStatus(token: string, settings: UserSettings) {
  const res = await fetch(`${proxyBase(settings)}/v1/rag/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { indexedChunks: number; ready: boolean };
}

export function gradebookExportUrl(settings: UserSettings, classId: string, token: string): string {
  const base = proxyBase(settings);
  return `${base}/v1/teacher/classes/${classId}/gradebook/export.csv?token=${encodeURIComponent(token)}`;
}

export async function downloadGradebookCsv(
  token: string,
  settings: UserSettings,
  classId: string,
): Promise<Blob> {
  const res = await fetch(`${proxyBase(settings)}/v1/teacher/classes/${classId}/gradebook/export.csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function ltiGradePassback(
  token: string,
  settings: UserSettings,
  payload: {
    classId: string;
    assignmentId: string;
    enrollmentId: string;
    ltiUserId?: string;
    lineItemUrl?: string;
  },
) {
  const res = await fetch(`${proxyBase(settings)}/v1/lti/grade-passback`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { id: string; status: string; payload: { scoreGiven: number } };
}

/** Push all graded cells in class to LTI AGS (stub queue when platform token absent). */
export async function ltiPassbackClassGrades(
  token: string,
  settings: UserSettings,
  classId: string,
  cells: { enrollmentId: string; assignmentId: string; score?: number }[],
  roster: { id: string; studentEmail: string }[],
): Promise<number> {
  let count = 0;
  for (const cell of cells) {
    if (cell.score == null) continue;
    const student = roster.find((r) => r.id === cell.enrollmentId);
    await ltiGradePassback(token, settings, {
      classId,
      assignmentId: cell.assignmentId,
      enrollmentId: cell.enrollmentId,
      ltiUserId: student?.studentEmail,
    });
    count += 1;
  }
  return count;
}
