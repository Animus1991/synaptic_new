/**
 * MCP OAuth 2.1 in-memory stores: Dynamic Client Registration (RFC 7591) and
 * short-lived PKCE authorization codes. Auth codes are ephemeral and one-time,
 * so in-memory is appropriate for a single-instance pilot; persistence can be
 * added later behind the same interface.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

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
  return client;
}

export function getClient(clientId: string): RegisteredClient | undefined {
  return clients.get(clientId);
}

export function isRegisteredRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = clients.get(clientId);
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
