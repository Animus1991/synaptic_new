import { addClassEnrollmentAsync, listClassRosterAsync } from '../store/classStore';

export type LtiNrpsMember = {
  userId: string;
  email: string;
  displayName?: string;
  roles: string[];
};

export type LtiLaunchSession = {
  ltiContextId: string;
  contextTitle?: string;
  nrpsUrl?: string;
  ltiSub?: string;
  email?: string;
  expires: number;
};

export type LtiContextLink = {
  classId: string;
  ltiContextId: string;
  contextTitle?: string;
  nrpsUrl?: string;
  linkedAt: string;
  lastSyncedAt?: string;
};

export type LtiRosterSyncResult = {
  classId: string;
  ltiContextId: string;
  added: number;
  skipped: number;
  total: number;
  syncedAt: string;
  source: 'nrps' | 'stub';
};

const LEARNER_ROLE_MARKERS = ['#Learner', '#Student', 'Learner', 'Student'];
const INSTRUCTOR_ROLE_MARKERS = ['#Instructor', '#Administrator', 'Instructor', 'Administrator'];

const launchSessions = new Map<string, LtiLaunchSession>();
const linksByClass = new Map<string, LtiContextLink>();
const linksByContext = new Map<string, string>();

export function saveLtiLaunchSession(session: Omit<LtiLaunchSession, 'expires'>): void {
  launchSessions.set(session.ltiContextId, {
    ...session,
    expires: Date.now() + 60 * 60_000,
  });
}

export function getLtiLaunchSession(ltiContextId: string): LtiLaunchSession | null {
  const row = launchSessions.get(ltiContextId);
  if (!row || row.expires < Date.now()) {
    launchSessions.delete(ltiContextId);
    return null;
  }
  return row;
}

export function linkLtiContextToClass(
  classId: string,
  payload: { ltiContextId: string; contextTitle?: string; nrpsUrl?: string },
): LtiContextLink {
  const ltiContextId = payload.ltiContextId.trim();
  const session = getLtiLaunchSession(ltiContextId);
  const link: LtiContextLink = {
    classId,
    ltiContextId,
    contextTitle: payload.contextTitle?.trim() || session?.contextTitle,
    nrpsUrl: payload.nrpsUrl?.trim() || session?.nrpsUrl,
    linkedAt: new Date().toISOString(),
  };
  linksByClass.set(classId, link);
  linksByContext.set(ltiContextId, classId);
  return link;
}

export function getLtiContextLink(classId: string): LtiContextLink | null {
  return linksByClass.get(classId) ?? null;
}

export function getClassIdForLtiContext(ltiContextId: string): string | null {
  return linksByContext.get(ltiContextId) ?? null;
}

export function isLearnerRole(roles: string[]): boolean {
  if (roles.length === 0) return true;
  if (roles.some((role) => INSTRUCTOR_ROLE_MARKERS.some((marker) => role.includes(marker)))) {
    return false;
  }
  return roles.some((role) => LEARNER_ROLE_MARKERS.some((marker) => role.includes(marker)));
}

export function parseNrpsMembers(body: unknown): LtiNrpsMember[] {
  if (!body || typeof body !== 'object') return [];
  const members = (body as { members?: unknown[] }).members;
  if (!Array.isArray(members)) return [];
  const rows: LtiNrpsMember[] = [];
  for (const raw of members) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as {
      user_id?: string;
      email?: string;
      name?: string;
      roles?: string[];
      status?: string;
    };
    if (row.status && row.status !== 'Active') continue;
    const userId = row.user_id?.trim();
    if (!userId) continue;
    const email = row.email?.trim().toLowerCase() || `${userId}@lti.local`;
    const roles = Array.isArray(row.roles) ? row.roles.map(String) : [];
    if (!isLearnerRole(roles)) continue;
    rows.push({
      userId,
      email,
      displayName: row.name?.trim() || undefined,
      roles,
    });
  }
  return rows;
}

export async function fetchNrpsMembers(
  nrpsUrl: string,
  bearerToken?: string,
): Promise<LtiNrpsMember[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.ims.lis.v2.membershipcontainer+json',
  };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const res = await fetch(nrpsUrl, { headers });
  if (!res.ok) {
    throw new Error(`NRPS fetch failed: ${res.status}`);
  }
  const body = (await res.json()) as unknown;
  return parseNrpsMembers(body);
}

export async function syncLtiMembersToClass(
  classId: string,
  members: LtiNrpsMember[],
  source: 'nrps' | 'stub',
  ltiContextId: string,
): Promise<LtiRosterSyncResult> {
  let added = 0;
  let skipped = 0;
  const roster = await listClassRosterAsync(classId);
  const existingEmails = new Set(roster.map((r) => r.studentEmail.toLowerCase()));
  for (const member of members) {
    if (existingEmails.has(member.email.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const row = await addClassEnrollmentAsync(classId, {
      email: member.email,
      displayName: member.displayName,
    });
    if (row) {
      added += 1;
      existingEmails.add(member.email.toLowerCase());
    } else {
      skipped += 1;
    }
  }
  const syncedAt = new Date().toISOString();
  const existing = linksByClass.get(classId);
  if (existing) {
    linksByClass.set(classId, { ...existing, lastSyncedAt: syncedAt });
  }
  return {
    classId,
    ltiContextId,
    added,
    skipped,
    total: members.length,
    syncedAt,
    source,
  };
}

export function resetLtiRosterSyncState(): void {
  launchSessions.clear();
  linksByClass.clear();
  linksByContext.clear();
}
