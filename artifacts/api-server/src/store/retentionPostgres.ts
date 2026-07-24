import pg from 'pg';

const { Pool } = pg;

export type RetentionRepository = {
  purgeAuditLogsBefore(cutoff: Date): Promise<number>;
  purgeTranscribeJobsBefore(cutoff: Date): Promise<number>;
  anonymizeAuditLogsForAccount(accountId: string): Promise<number>;
  deleteTranscribeJobsForAccount(accountId: string): Promise<number>;
  deleteGoogleOAuthForAccount(accountId: string): Promise<number>;
};

export function createRetentionRepository(databaseUrl: string | undefined): RetentionRepository | null {
  if (!databaseUrl?.trim()) return null;
  const pool = new Pool({ connectionString: databaseUrl.trim() });

  return {
    async purgeAuditLogsBefore(cutoff) {
      const r = await pool.query(`DELETE FROM audit_logs WHERE created_at < $1::timestamptz`, [
        cutoff.toISOString(),
      ]);
      return r.rowCount ?? 0;
    },

    async purgeTranscribeJobsBefore(cutoff) {
      const r = await pool.query(`DELETE FROM transcribe_jobs WHERE created_at < $1::timestamptz`, [
        cutoff.toISOString(),
      ]);
      return r.rowCount ?? 0;
    },

    async anonymizeAuditLogsForAccount(accountId) {
      const r = await pool.query(`UPDATE audit_logs SET account_id = NULL WHERE account_id = $1`, [
        accountId,
      ]);
      return r.rowCount ?? 0;
    },

    async deleteTranscribeJobsForAccount(accountId) {
      const r = await pool.query(`DELETE FROM transcribe_jobs WHERE account_id = $1`, [accountId]);
      return r.rowCount ?? 0;
    },

    async deleteGoogleOAuthForAccount(accountId) {
      const r = await pool.query(`DELETE FROM google_oauth_tokens WHERE account_id = $1`, [accountId]);
      return r.rowCount ?? 0;
    },
  };
}

/** OPS-03 — account deletion cascade within an existing transaction. */
export async function deleteAccountRetentionDataInTx(
  client: pg.PoolClient,
  accountId: string,
): Promise<void> {
  await client.query(`UPDATE audit_logs SET account_id = NULL WHERE account_id = $1`, [accountId]);
  await client.query(`DELETE FROM transcribe_jobs WHERE account_id = $1`, [accountId]);
  await client.query(`DELETE FROM google_oauth_tokens WHERE account_id = $1`, [accountId]);
}
