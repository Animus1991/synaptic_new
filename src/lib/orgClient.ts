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
  cohortHeatmap?: {
    classId: string;
    className: string;
    days: {
      date: string;
      gradedCount: number;
      activeStudents: number;
      avgScore: number | null;
    }[];
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

export async function fetchStudentAnnouncements(
  token: string,
  settings: UserSettings,
  opts?: { classId?: string },
) {
  const url = new URL(`${proxyBase(settings)}/v1/student/announcements`);
  if (opts?.classId) url.searchParams.set('classId', opts.classId);
  const res = await fetch(url.toString(), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    email: string;
    announcements: {
      id: string;
      classId: string;
      className: string;
      title: string;
      body: string;
      authorAccountId: string;
      createdAt: string;
    }[];
  };
}

export async function fetchStudentAssignmentDiscussion(
  token: string,
  settings: UserSettings,
  classId: string,
  assignmentId: string,
) {
  const res = await fetch(
    `${proxyBase(settings)}/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    classId: string;
    assignmentId: string;
    posts: {
      id: string;
      classId: string;
      assignmentId: string;
      authorAccountId: string;
      authorRole: 'teacher' | 'student';
      body: string;
      createdAt: string;
    }[];
  };
}

export async function postStudentAssignmentDiscussion(
  token: string,
  settings: UserSettings,
  classId: string,
  assignmentId: string,
  body: string,
) {
  const res = await fetch(
    `${proxyBase(settings)}/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    id: string;
    authorAccountId: string;
    authorRole: 'teacher' | 'student';
    body: string;
    createdAt: string;
  };
}

export async function deleteStudentAssignmentDiscussionPost(
  token: string,
  settings: UserSettings,
  classId: string,
  assignmentId: string,
  postId: string,
) {
  const res = await fetch(
    `${proxyBase(settings)}/v1/student/classes/${classId}/assignments/${assignmentId}/discussion/${postId}`,
    { method: 'DELETE', headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await res.text());
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

export async function fetchLtiLaunchContext(
  token: string,
  settings: UserSettings,
  ltiContextId: string,
) {
  const res = await fetch(
    `${proxyBase(settings)}/v1/lti/launch-context/${encodeURIComponent(ltiContextId)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    ltiContextId: string;
    contextTitle?: string;
    hasNrpsUrl: boolean;
    linkedClassId?: string;
  };
}

export async function linkLtiClassContext(
  token: string,
  settings: UserSettings,
  classId: string,
  payload: { ltiContextId: string; contextTitle?: string; nrpsUrl?: string },
) {
  const res = await fetch(`${proxyBase(settings)}/v1/lti/classes/${classId}/context-link`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    link: {
      classId: string;
      ltiContextId: string;
      contextTitle?: string;
      linkedAt: string;
    };
  };
}

export async function syncLtiClassRoster(
  token: string,
  settings: UserSettings,
  classId: string,
  payload?: {
    ltiContextId?: string;
    members?: Array<{ userId?: string; email?: string; displayName?: string; roles?: string[] }>;
    useStub?: boolean;
  },
) {
  const res = await fetch(`${proxyBase(settings)}/v1/lti/classes/${classId}/roster-sync`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    classId: string;
    ltiContextId: string;
    added: number;
    skipped: number;
    total: number;
    syncedAt: string;
    source: 'nrps' | 'stub';
  };
}
