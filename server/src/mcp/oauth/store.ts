/**
 * MCP OAuth 2.1 stores: Dynamic Client Registration (RFC 7591) + short-lived PKCE codes.
 * Registered clients persist to Postgres when DATABASE_URL is set (MCP-03).
 * Auth codes stay in-memory (60s TTL, one-time use).
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import { config } from '../../config';

export interface RegisteredClient {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
  createdAt: number;
  /** Public PKCE clients only (no secret). */
  tokenEndpointAuthMethod: 'none';
  scope?: string;
}

interface AuthCodeEntry {
  clientId: string;
  accountId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scope: string;
  expiresAt: number;
}

const clients = new Map<string, RegisteredClient>();
const authCodes = new Map<string, AuthCodeEntry>();

const AUTH_CODE_TTL_MS = 60_000;

const { Pool } = pg;
let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!config.databaseUrl?.trim()) return null;
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl.trim() });
  return pool;
}

async function persistClient(client: RegisteredClient): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO mcp_oauth_clients
      (client_id, redirect_uris, client_name, scope, token_endpoint_auth_method, created_at)
     VALUES ($1, $2::jsonb, $3, $4, $5, to_timestamp($6 / 1000.0))
     ON CONFLICT (client_id) DO UPDATE SET
       redirect_uris = EXCLUDED.redirect_uris,
       client_name = EXCLUDED.client_name,
       scope = EXCLUDED.scope`,
    [
      client.clientId,
      JSON.stringify(client.redirectUris),
      client.clientName ?? null,
      client.scope ?? null,
      client.tokenEndpointAuthMethod,
      client.createdAt,
    ],
  );
}

async function loadClientFromDb(clientId: string): Promise<RegisteredClient | null> {
  const p = getPool();
  if (!p) return null;
  const res = await p.query<{
    client_id: string;
    redirect_uris: string[] | string;
    client_name: string | null;
    scope: string | null;
    token_endpoint_auth_method: string;
    created_at: Date;
  }>('SELECT * FROM mcp_oauth_clients WHERE client_id = $1', [clientId]);
  if (!res.rowCount) return null;
  const row = res.rows[0]!;
  const uris = Array.isArray(row.redirect_uris)
    ? row.redirect_uris
    : (typeof row.redirect_uris === 'string' ? JSON.parse(row.redirect_uris) as string[] : []);
  return {
    clientId: row.client_id,
    redirectUris: uris,
    clientName: row.client_name ?? undefined,
    scope: row.scope ?? undefined,
    tokenEndpointAuthMethod: 'none',
    createdAt: row.created_at.getTime(),
  };
}

// --- Client registration --------------------------------------------------

export function registerClient(input: {
  redirectUris: string[];
  clientName?: string;
  scope?: string;
}): RegisteredClient {
  const client: RegisteredClient = {
    clientId: `mcp-${randomUUID()}`,
    redirectUris: input.redirectUris,
    clientName: input.clientName,
    scope: input.scope,
    createdAt: Date.now(),
    tokenEndpointAuthMethod: 'none',
  };
  clients.set(client.clientId, client);
  void persistClient(client).catch((err) => {
    console.warn('[mcp oauth] persist client failed:', (err as Error).message);
  });
  return client;
}

export function getClient(clientId: string): RegisteredClient | undefined {
  return clients.get(clientId);
}

export async function getClientAsync(clientId: string): Promise<RegisteredClient | undefined> {
  const mem = clients.get(clientId);
  if (mem) return mem;
  const fromDb = await loadClientFromDb(clientId);
  if (fromDb) clients.set(clientId, fromDb);
  return fromDb ?? undefined;
}

export function isRegisteredRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = clients.get(clientId);
  return Boolean(client && client.redirectUris.includes(redirectUri));
}

export async function isRegisteredRedirectUriAsync(
  clientId: string,
  redirectUri: string,
): Promise<boolean> {
  const client = await getClientAsync(clientId);
  return Boolean(client && client.redirectUris.includes(redirectUri));
}

// --- Authorization codes (PKCE) ------------------------------------------

export function issueAuthCode(entry: Omit<AuthCodeEntry, 'expiresAt'>): string {
  const code = randomBytes(32).toString('base64url');
  authCodes.set(hash(code), { ...entry, expiresAt: Date.now() + AUTH_CODE_TTL_MS });
  return code;
}

/**
 * Consume an authorization code exactly once, validating the PKCE verifier,
 * the client id and the redirect URI. Returns the accountId + scope on success.
 */
export function consumeAuthCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): { accountId: string; scope: string } | { error: string } {
  const key = hash(input.code);
  const entry = authCodes.get(key);
  if (!entry) return { error: 'invalid_grant' };
  authCodes.delete(key); // one-time use

  if (entry.expiresAt < Date.now()) return { error: 'invalid_grant' };
  if (entry.clientId !== input.clientId) return { error: 'invalid_grant' };
  if (entry.redirectUri !== input.redirectUri) return { error: 'invalid_grant' };
  if (!verifyPkce(input.codeVerifier, entry.codeChallenge)) return { error: 'invalid_grant' };

  return { accountId: entry.accountId, scope: entry.scope };
}

// --- PKCE ------------------------------------------------------------------

/** S256: base64url(sha256(verifier)) must equal the stored challenge. */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) return false;
  const computed = createHash('sha256').update(codeVerifier).digest('base64url');
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hash(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Test helper — clears all in-memory state. */
export function __resetOAuthStore(): void {
  clients.clear();
  authCodes.clear();
}
