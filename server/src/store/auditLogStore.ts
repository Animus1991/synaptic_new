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
  opts: { limit?: number; since?: string; maxCap?: number } = {},
): Promise<AuditLogEntry[]> {
  const cap = opts.maxCap ?? 200;
  const limit = Math.min(cap, Math.max(1, opts.limit ?? 50));
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

export function purgeMemoryAuditLogsBefore(cutoff: Date): number {
  const cutoffMs = cutoff.getTime();
  let removed = 0;
  for (let i = memory.length - 1; i >= 0; i--) {
    if (Date.parse(memory[i]!.createdAt) < cutoffMs) {
      memory.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

export function anonymizeMemoryAuditLogsForAccount(accountId: string): number {
  let count = 0;
  for (const entry of memory) {
    if (entry.accountId === accountId) {
      entry.accountId = undefined;
      count++;
    }
  }
  return count;
}

/** Test helper */
export function resetAuditLogStore(): void {
  memory.length = 0;
}
