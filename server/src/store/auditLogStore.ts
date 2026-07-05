import { config } from '../config';
import { createAuditLogRepository } from './auditLogPostgres';

export type AuditLogEntry = {
  id: string;
  orgId?: string;
  accountId?: string;
  action: string;
  resource?: string;
  metadata: Record<string, unknown>;
  ip?: string;
  createdAt: string;
};

const memory: AuditLogEntry[] = [];
const pgRepo = createAuditLogRepository(config.databaseUrl);

export async function appendAuditLogAsync(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
  const row: AuditLogEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  if (pgRepo) {
    return pgRepo.append(row);
  }
  memory.unshift(row);
  if (memory.length > 5000) memory.length = 5000;
  return row;
}

export async function listAuditLogsForOrgAsync(
  orgId: string,
  opts: { limit?: number; since?: string } = {},
): Promise<AuditLogEntry[]> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  if (pgRepo) return pgRepo.listForOrg(orgId, { limit, since: opts.since });
  let rows = memory.filter((e) => e.orgId === orgId);
  if (opts.since) {
    const sinceMs = Date.parse(opts.since);
    if (Number.isFinite(sinceMs)) {
      rows = rows.filter((e) => Date.parse(e.createdAt) >= sinceMs);
    }
  }
  return rows.slice(0, limit);
}

/** Test helper */
export function resetAuditLogStore(): void {
  memory.length = 0;
}
