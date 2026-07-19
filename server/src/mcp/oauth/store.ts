/**
 * MCP OAuth 2.1 stores: Dynamic Client Registration (RFC 7591) and
 * short-lived PKCE authorization codes.
 * Uses Postgres when DATABASE_URL is set (multi-instance); memory otherwise.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../../config';
import { createMcpOAuthRepo } from '../../store/postgresMcpOAuth';

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
const pgRepo = createMcpOAuthRepo(config.databaseUrl);

const AUTH_CODE_TTL_MS = 60_000;

// --- Client registration --------------------------------------------------

export async function registerClient(input: {
  redirectUris: string[];
  clientName?: string;
  scope?: string;
}): Promise<RegisteredClient> {
  const client: RegisteredClient = {
    clientId: `mcp-${randomUUID()}`,
    redirectUris: input.redirectUris,
    clientName: input.clientName,
    scope: input.scope,
    createdAt: Date.now(),
    tokenEndpointAuthMethod: 'none',
  };
  if (pgRepo) {
    await pgRepo.saveClient(client);
    return client;
  }
  clients.set(client.clientId, client);
  return client;
}

export async function getClient(clientId: string): Promise<RegisteredClient | undefined> {
  if (pgRepo) return pgRepo.getClient(clientId);
  return clients.get(clientId);
}

export async function isRegisteredRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
  const client = await getClient(clientId);
  return Boolean(client && client.redirectUris.includes(redirectUri));
}

// --- Authorization codes (PKCE) ------------------------------------------

export async function issueAuthCode(entry: Omit<AuthCodeEntry, 'expiresAt'>): Promise<string> {
  const code = randomBytes(32).toString('base64url');
  const stored: AuthCodeEntry = { ...entry, expiresAt: Date.now() + AUTH_CODE_TTL_MS };
  if (pgRepo) {
    await pgRepo.issueAuthCode(hash(code), stored);
    return code;
  }
  authCodes.set(hash(code), stored);
  return code;
}

/**
 * Consume an authorization code exactly once, validating the PKCE verifier,
 * the client id and the redirect URI. Returns the accountId + scope on success.
 */
export async function consumeAuthCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accountId: string; scope: string } | { error: string }> {
  const key = hash(input.code);

  let entry: AuthCodeEntry | undefined;
  if (pgRepo) {
    entry = await pgRepo.consumeAuthCode(key);
  } else {
    entry = authCodes.get(key);
    if (entry) authCodes.delete(key);
  }

  if (!entry) return { error: 'invalid_grant' };
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
