import pg from 'pg';
import type { GoogleTokenRecord } from './googleTokenStore';

const { Pool } = pg;

export interface GoogleTokenRepository {
  save(record: GoogleTokenRecord): Promise<void>;
  getByAccountId(accountId: string): Promise<GoogleTokenRecord | undefined>;
  deleteByAccountId(accountId: string): Promise<boolean>;
}

type Row = {
  account_id: string;
  google_sub: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  scopes: string[] | null;
  updated_at: Date;
};

function rowToRecord(row: Row): GoogleTokenRecord {
  return {
    accountId: row.account_id,
    googleSub: row.google_sub,
    email: row.email,
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ? row.expires_at.getTime() : 0,
    scopes: row.scopes ?? [],
    updatedAt: row.updated_at.toISOString(),
  };
}

export function createPostgresGoogleTokenRepo(databaseUrl: string): GoogleTokenRepository {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async save(record) {
      await pool.query(
        `INSERT INTO google_oauth_tokens
           (account_id, google_sub, email, access_token, refresh_token, expires_at, scopes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::text[], $8::timestamptz)
         ON CONFLICT (account_id) DO UPDATE SET
           google_sub = EXCLUDED.google_sub,
           email = EXCLUDED.email,
           access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
           expires_at = EXCLUDED.expires_at,
           scopes = EXCLUDED.scopes,
           updated_at = EXCLUDED.updated_at`,
        [
          record.accountId,
          record.googleSub,
          record.email,
          record.accessToken,
          record.refreshToken ?? null,
          new Date(record.expiresAt).toISOString(),
          record.scopes,
          record.updatedAt,
        ],
      );
    },

    async getByAccountId(accountId) {
      const res = await pool.query<Row>(
        'SELECT * FROM google_oauth_tokens WHERE account_id = $1',
        [accountId],
      );
      return res.rowCount ? rowToRecord(res.rows[0]!) : undefined;
    },

    async deleteByAccountId(accountId) {
      const res = await pool.query('DELETE FROM google_oauth_tokens WHERE account_id = $1', [accountId]);
      return (res.rowCount ?? 0) > 0;
    },
  };
}

export function createGoogleTokenRepo(databaseUrl: string | undefined): GoogleTokenRepository | null {
  if (!databaseUrl?.trim()) return null;
  return createPostgresGoogleTokenRepo(databaseUrl.trim());
}
