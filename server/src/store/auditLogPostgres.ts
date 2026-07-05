import pg from 'pg';
import type { AuditLogEntry } from './auditLogStore';

const { Pool } = pg;

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listForOrg(orgId: string, opts: { limit: number; since?: string }): Promise<AuditLogEntry[]>;
}

function rowToEntry(row: {
  id: string;
  org_id: string | null;
  account_id: string | null;
  action: string;
  resource: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: Date;
}): AuditLogEntry {
  return {
    id: row.id,
    orgId: row.org_id ?? undefined,
    accountId: row.account_id ?? undefined,
    action: row.action,
    resource: row.resource ?? undefined,
    metadata: row.metadata ?? {},
    ip: row.ip ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export function createAuditLogRepository(databaseUrl?: string): AuditLogRepository | null {
  if (!databaseUrl?.trim()) return null;
  const pool = new Pool({ connectionString: databaseUrl.trim() });

  return {
    async append(entry: AuditLogEntry): Promise<AuditLogEntry> {
      await pool.query(
        `INSERT INTO audit_logs (id, org_id, account_id, action, resource, metadata, ip, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.id,
          entry.orgId ?? null,
          entry.accountId ?? null,
          entry.action,
          entry.resource ?? null,
          JSON.stringify(entry.metadata ?? {}),
          entry.ip ?? null,
          entry.createdAt,
        ],
      );
      return entry;
    },

    async listForOrg(orgId: string, opts: { limit: number; since?: string }): Promise<AuditLogEntry[]> {
      const params: unknown[] = [orgId, opts.limit];
      let sql = `SELECT id, org_id, account_id, action, resource, metadata, ip, created_at
                 FROM audit_logs WHERE org_id = $1`;
      if (opts.since) {
        params.push(opts.since);
        sql += ` AND created_at >= $3`;
      }
      sql += ` ORDER BY created_at DESC LIMIT $2`;
      const res = await pool.query(sql, params);
      return res.rows.map(rowToEntry);
    },
  };
}
