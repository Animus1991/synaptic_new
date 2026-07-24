/**
 * Postgres persistence for Google OAuth tokens (MCP-03 / multi-instance).
 * Soft-fails when DATABASE_URL is unset — callers keep the in-memory cache.
 */
import pg from 'pg';
import { config } from '../config';
import type { GoogleTokenRecord } from './googleTokenStore';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!config.databaseUrl?.trim()) return null;
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl.trim() });
  return pool;
}

function rowToRecord(row: {
  account_id: string;
  google_sub: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  scopes: string[] | null;
  updated_at: Date;
}): GoogleTokenRecord {
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

export async function upsertGoogleTokenRecord(record: GoogleTokenRecord): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO google_oauth_tokens
      (account_id, google_sub, email, access_token, refresh_token, expires_at, scopes, updated_at)
     VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7, $8::timestamptz)
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
      record.expiresAt,
      record.scopes,
      record.updatedAt,
    ],
  );
}

export async function loadGoogleTokenRecord(accountId: string): Promise<GoogleTokenRecord | null> {
  const p = getPool();
  if (!p) return null;
  const res = await p.query<{
    account_id: string;
    google_sub: string;
    email: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: Date | null;
    scopes: string[] | null;
    updated_at: Date;
  }>('SELECT * FROM google_oauth_tokens WHERE account_id = $1', [accountId]);
  if (!res.rowCount) return null;
  return rowToRecord(res.rows[0]!);
}

export async function deleteGoogleTokenRecord(accountId: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  const res = await p.query('DELETE FROM google_oauth_tokens WHERE account_id = $1', [accountId]);
  return (res.rowCount ?? 0) > 0;
}

export async function loadAllGoogleTokenRecords(): Promise<GoogleTokenRecord[]> {
  const p = getPool();
  if (!p) return [];
  const res = await p.query<{
    account_id: string;
    google_sub: string;
    email: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: Date | null;
    scopes: string[] | null;
    updated_at: Date;
  }>('SELECT * FROM google_oauth_tokens');
  return res.rows.map(rowToRecord);
}
