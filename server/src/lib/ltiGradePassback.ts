import { randomUUID } from 'crypto';
import pg from 'pg';
import { config } from '../config';
import { resolveLtiAgsBearer } from './ltiAgsOAuth';

const { Pool } = pg;

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
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
};

type LineItemRow = {
  classId: string;
  assignmentId: string;
  lineItemUrl: string;
  resourceLinkId?: string;
};

const lineItemByAssignment = new Map<string, LineItemRow>();
const passbackLog: LtiPassbackRecord[] = [];

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!config.databaseUrl?.trim()) return null;
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl.trim() });
  return pool;
}

function assignmentKey(classId: string, assignmentId: string): string {
  return `${classId}:${assignmentId}`;
}

function scoresEndpoint(lineItemUrl: string): string {
  const base = lineItemUrl.replace(/\/$/, '');
  return base.endsWith('/scores') ? base : `${base}/scores`;
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

export async function registerLtiLineItem(
  classId: string,
  assignmentId: string,
  lineItemUrl: string,
  resourceLinkId?: string,
): Promise<{ classId: string; assignmentId: string; lineItemUrl: string; resourceLinkId?: string }> {
  const url = lineItemUrl.trim();
  const row: LineItemRow = {
    classId,
    assignmentId,
    lineItemUrl: url,
    resourceLinkId: resourceLinkId?.trim() || undefined,
  };
  lineItemByAssignment.set(assignmentKey(classId, assignmentId), row);

  const p = getPool();
  if (p) {
    await p.query(
      `INSERT INTO lti_line_items (class_id, assignment_id, line_item_url, resource_link_id, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (class_id, assignment_id) DO UPDATE SET
         line_item_url = EXCLUDED.line_item_url,
         resource_link_id = COALESCE(EXCLUDED.resource_link_id, lti_line_items.resource_link_id),
         updated_at = NOW()`,
      [classId, assignmentId, url, row.resourceLinkId ?? null],
    );
  }

  return {
    classId,
    assignmentId,
    lineItemUrl: url,
    resourceLinkId: row.resourceLinkId,
  };
}

export async function getLtiLineItemUrl(classId: string, assignmentId: string): Promise<string | undefined> {
  const mem = lineItemByAssignment.get(assignmentKey(classId, assignmentId));
  if (mem) return mem.lineItemUrl;

  const p = getPool();
  if (!p) return undefined;
  const res = await p.query<{ line_item_url: string; resource_link_id: string | null }>(
    `SELECT line_item_url, resource_link_id FROM lti_line_items
     WHERE class_id = $1 AND assignment_id = $2`,
    [classId, assignmentId],
  );
  const row = res.rows[0];
  if (!row) return undefined;
  lineItemByAssignment.set(assignmentKey(classId, assignmentId), {
    classId,
    assignmentId,
    lineItemUrl: row.line_item_url,
    resourceLinkId: row.resource_link_id ?? undefined,
  });
  return row.line_item_url;
}

async function persistPassbackRecord(record: LtiPassbackRecord): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO lti_passback_log
      (id, class_id, assignment_id, enrollment_id, lti_user_id, line_item_url, payload,
       status, platform_status, platform_body, attempt_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12::timestamptz,$13::timestamptz)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       platform_status = EXCLUDED.platform_status,
       platform_body = EXCLUDED.platform_body,
       attempt_count = EXCLUDED.attempt_count,
       line_item_url = EXCLUDED.line_item_url,
       payload = EXCLUDED.payload,
       updated_at = EXCLUDED.updated_at`,
    [
      record.id,
      record.classId,
      record.assignmentId,
      record.enrollmentId,
      record.ltiUserId,
      record.lineItemUrl ?? null,
      JSON.stringify(record.payload),
      record.status,
      record.platformStatus ?? null,
      record.platformBody ?? null,
      record.attemptCount,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

async function postAgsScore(lineItemUrl: string, payload: LtiAgsScore): Promise<{
  ok: boolean;
  status?: number;
  body?: string;
}> {
  const token = await resolveLtiAgsBearer();
  if (!token) return { ok: false };

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
    const body = (await res.text().catch(() => '')).slice(0, 500);
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, body: e instanceof Error ? e.message : 'passback failed' };
  }
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
  const lineItemUrl = opts.lineItemUrl?.trim() || (await getLtiLineItemUrl(opts.classId, opts.assignmentId));
  const payload = buildLtiAgsScore(opts.score, opts.ltiUserId, opts.comment);
  const now = new Date().toISOString();
  const record: LtiPassbackRecord = {
    id: `lti_pb_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    classId: opts.classId,
    assignmentId: opts.assignmentId,
    enrollmentId: opts.enrollmentId,
    ltiUserId: opts.ltiUserId,
    lineItemUrl,
    payload,
    status: 'stub_queued',
    attemptCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  if (!lineItemUrl) {
    passbackLog.unshift(record);
    await persistPassbackRecord(record);
    return record;
  }

  const token = await resolveLtiAgsBearer();
  if (!token) {
    record.status = 'stub_queued';
    passbackLog.unshift(record);
    await persistPassbackRecord(record);
    return record;
  }

  const result = await postAgsScore(lineItemUrl, payload);
  record.platformStatus = result.status;
  record.platformBody = result.body;
  if (!result.status && !result.body) {
    // No bearer effectively (postAgsScore returned early) — treat as stub.
    record.status = 'stub_queued';
  } else {
    record.status = result.ok ? 'submitted' : 'failed';
  }

  passbackLog.unshift(record);
  await persistPassbackRecord(record);
  return record;
}

function rowToPassback(row: {
  id: string;
  class_id: string;
  assignment_id: string;
  enrollment_id: string;
  lti_user_id: string;
  line_item_url: string | null;
  payload: LtiAgsScore | string;
  status: string;
  platform_status: number | null;
  platform_body: string | null;
  attempt_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}): LtiPassbackRecord {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) as LtiAgsScore : row.payload;
  return {
    id: row.id,
    classId: row.class_id,
    assignmentId: row.assignment_id,
    enrollmentId: row.enrollment_id,
    ltiUserId: row.lti_user_id,
    lineItemUrl: row.line_item_url ?? undefined,
    payload,
    status: row.status as LtiPassbackRecord['status'],
    platformStatus: row.platform_status ?? undefined,
    platformBody: row.platform_body ?? undefined,
    attemptCount: row.attempt_count,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString(),
  };
}

export async function listLtiPassbackLog(classId?: string, limit = 50): Promise<LtiPassbackRecord[]> {
  const p = getPool();
  if (p) {
    const res = classId
      ? await p.query(
        `SELECT * FROM lti_passback_log WHERE class_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [classId, limit],
      )
      : await p.query(
        `SELECT * FROM lti_passback_log ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
    if ((res.rowCount ?? 0) > 0) {
      return res.rows.map((r) => rowToPassback(r as Parameters<typeof rowToPassback>[0]));
    }
  }
  const rows = classId ? passbackLog.filter((r) => r.classId === classId) : passbackLog;
  return rows.slice(0, limit);
}

/** Retry stub_queued / failed passbacks that have a line item + bearer. */
export async function retryLtiPassback(recordId: string): Promise<LtiPassbackRecord | null> {
  let record = passbackLog.find((r) => r.id === recordId) ?? null;
  const p = getPool();
  if (!record && p) {
    const res = await p.query(`SELECT * FROM lti_passback_log WHERE id = $1`, [recordId]);
    if ((res.rowCount ?? 0) > 0) {
      record = rowToPassback(res.rows[0] as Parameters<typeof rowToPassback>[0]);
    }
  }
  if (!record) return null;
  if (record.status === 'submitted') return record;

  const lineItemUrl = record.lineItemUrl?.trim()
    || (await getLtiLineItemUrl(record.classId, record.assignmentId));
  if (!lineItemUrl) return record;

  const token = await resolveLtiAgsBearer();
  if (!token) return record;

  const result = await postAgsScore(lineItemUrl, record.payload);
  const updated: LtiPassbackRecord = {
    ...record,
    lineItemUrl,
    attemptCount: record.attemptCount + 1,
    platformStatus: result.status,
    platformBody: result.body,
    status: result.ok ? 'submitted' : 'failed',
    updatedAt: new Date().toISOString(),
  };

  const idx = passbackLog.findIndex((r) => r.id === recordId);
  if (idx >= 0) passbackLog[idx] = updated;
  else passbackLog.unshift(updated);
  await persistPassbackRecord(updated);
  return updated;
}

export async function retryFailedLtiPassbacks(classId?: string, limit = 20): Promise<LtiPassbackRecord[]> {
  const log = await listLtiPassbackLog(classId, 100);
  const candidates = log
    .filter((r) => r.status === 'failed' || r.status === 'stub_queued')
    .slice(0, limit);
  const out: LtiPassbackRecord[] = [];
  for (const row of candidates) {
    const retried = await retryLtiPassback(row.id);
    if (retried) out.push(retried);
  }
  return out;
}

export function resetLtiPassbackState(): void {
  lineItemByAssignment.clear();
  passbackLog.length = 0;
}

/** Sync helpers for tests without awaiting PG. */
export function getLtiLineItemUrlSync(classId: string, assignmentId: string): string | undefined {
  return lineItemByAssignment.get(assignmentKey(classId, assignmentId))?.lineItemUrl;
}
