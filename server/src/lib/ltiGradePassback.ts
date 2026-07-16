import { randomUUID } from 'crypto';
import { resolveLtiAgsBearer } from './ltiAgsOAuth';

/** IMS LTI Assignment and Grade Services (AGS) score payload. */
export type LtiAgsScore = {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  timestamp: string;
};

export type LtiPassbackRecord = {
  id: string;
  classId: string;
  assignmentId: string;
  enrollmentId: string;
  ltiUserId: string;
  lineItemUrl?: string;
  payload: LtiAgsScore;
  status: 'stub_queued' | 'submitted' | 'failed';
  platformStatus?: number;
  platformBody?: string;
  createdAt: string;
};

const lineItemByAssignment = new Map<string, string>();
const passbackLog: LtiPassbackRecord[] = [];

function assignmentKey(classId: string, assignmentId: string): string {
  return `${classId}:${assignmentId}`;
}

export function registerLtiLineItem(
  classId: string,
  assignmentId: string,
  lineItemUrl: string,
): { classId: string; assignmentId: string; lineItemUrl: string } {
  const url = lineItemUrl.trim();
  lineItemByAssignment.set(assignmentKey(classId, assignmentId), url);
  return { classId, assignmentId, lineItemUrl: url };
}

export function getLtiLineItemUrl(classId: string, assignmentId: string): string | undefined {
  return lineItemByAssignment.get(assignmentKey(classId, assignmentId));
}

export function buildLtiAgsScore(score: number, ltiUserId: string, comment?: string): LtiAgsScore {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    userId: ltiUserId.trim(),
    scoreGiven: clamped,
    scoreMaximum: 100,
    comment: comment?.trim() || 'Graded in Synapse',
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    timestamp: new Date().toISOString(),
  };
}

function scoresEndpoint(lineItemUrl: string): string {
  const base = lineItemUrl.replace(/\/$/, '');
  return base.endsWith('/scores') ? base : `${base}/scores`;
}

export async function submitLtiGradePassback(opts: {
  classId: string;
  assignmentId: string;
  enrollmentId: string;
  ltiUserId: string;
  score: number;
  lineItemUrl?: string;
  comment?: string;
}): Promise<LtiPassbackRecord> {
  let lineItemUrl = opts.lineItemUrl?.trim() || getLtiLineItemUrl(opts.classId, opts.assignmentId);

  // OPS-07: fall back to AGS lineitem captured on LTI launch for this class's linked context.
  if (!lineItemUrl) {
    try {
      const { getLtiContextLink, getLtiLaunchSession } = await import('./ltiRosterSync');
      const link = getLtiContextLink(opts.classId);
      const session = link ? getLtiLaunchSession(link.ltiContextId) : null;
      lineItemUrl = session?.agsLineItemUrl?.trim() || undefined;
    } catch {
      /* ignore */
    }
  }

  const payload = buildLtiAgsScore(opts.score, opts.ltiUserId, opts.comment);
  const record: LtiPassbackRecord = {
    id: `lti_pb_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    classId: opts.classId,
    assignmentId: opts.assignmentId,
    enrollmentId: opts.enrollmentId,
    ltiUserId: opts.ltiUserId,
    lineItemUrl,
    payload,
    status: 'stub_queued',
    createdAt: new Date().toISOString(),
  };

  if (!lineItemUrl) {
    passbackLog.unshift(record);
    return record;
  }

  const token = await resolveLtiAgsBearer();
  if (!token) {
    record.status = 'stub_queued';
    passbackLog.unshift(record);
    return record;
  }

  try {
    const res = await fetch(scoresEndpoint(lineItemUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    record.platformStatus = res.status;
    record.platformBody = (await res.text().catch(() => '')).slice(0, 500);
    record.status = res.ok ? 'submitted' : 'failed';
  } catch (e) {
    record.status = 'failed';
    record.platformBody = e instanceof Error ? e.message : 'passback failed';
  }

  passbackLog.unshift(record);
  return record;
}

export function listLtiPassbackLog(classId?: string, limit = 50): LtiPassbackRecord[] {
  const rows = classId ? passbackLog.filter((r) => r.classId === classId) : passbackLog;
  return rows.slice(0, limit);
}

export function resetLtiPassbackState(): void {
  lineItemByAssignment.clear();
  passbackLog.length = 0;
}
