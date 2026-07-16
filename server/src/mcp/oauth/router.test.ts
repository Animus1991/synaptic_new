import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';

vi.mock('../../config', () => ({ config: { mcpPublicUrl: 'https://synapse.test' } }));
vi.mock('../../store/accounts', () => ({
  findByEmailAsync: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('../../middleware/auth', () => ({
  signAccessToken: vi.fn(() => 'access-jwt'),
  signRefreshToken: vi.fn(async () => 'refresh-jwt'),
  verifyRefreshToken: vi.fn(async (raw: string) => (raw === 'refresh-jwt' ? 'acc-1' : null)),
}));

import {
  processRegistration,
  validateAuthorizeRequest,
  processDecision,
  exchangeToken,
} from './router';
import { __resetOAuthStore } from './store';
import { findByEmailAsync, verifyPassword } from '../../store/accounts';
import type { Account } from '../../store/accounts';

function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function registerTestClient(redirectUri = 'https://client.test/callback') {
  const reg = processRegistration({ redirect_uris: [redirectUri], client_name: 'Test Client' });
  const clientId = (reg.body as { client_id: string }).client_id;
  return { clientId, redirectUri };
}

const account = { id: 'acc-1', email: 'u@example.com' } as Account;

beforeEach(() => {
  __resetOAuthStore();
  vi.clearAllMocks();
});

describe('Dynamic Client Registration', () => {
  it('registers a public PKCE client', () => {
    const res = processRegistration({ redirect_uris: ['https://c.test/cb'], client_name: 'Claude' });
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(String(body.client_id)).toMatch(/^mcp-/);
    expect(body.token_endpoint_auth_method).toBe('none');
    expect(body.redirect_uris).toEqual(['https://c.test/cb']);
  });

  it('rejects registration without valid redirect_uris', () => {
    expect(processRegistration({}).status).toBe(400);
    expect(processRegistration({ redirect_uris: ['not-a-url'] }).status).toBe(400);
  });
});

describe('authorize validation', () => {
  it('accepts a valid PKCE authorize request', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const { challenge } = pkce();
    const v = await validateAuthorizeRequest({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      scope: 'courses:read progress:write bogus:scope',
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.request.scope).toBe('courses:read progress:write'); // bogus dropped
      expect(v.request.state).toBe('xyz');
    }
  });

  it('is a fatal error for unknown client', async () => {
    const v = await validateAuthorizeRequest({ client_id: 'nope', redirect_uri: 'https://x/y' });
    expect(v.ok).toBe(false);
    expect(v).toHaveProperty('fatal');
  });

  it('is fatal for an unregistered redirect_uri', async () => {
    const { clientId } = registerTestClient();
    const v = await validateAuthorizeRequest({ client_id: clientId, redirect_uri: 'https://evil.test/cb' });
    expect(v).toHaveProperty('fatal');
  });

  it('redirects with error when PKCE challenge is missing', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const v = await validateAuthorizeRequest({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: 's',
    });
    expect(v.ok).toBe(false);
    if (!v.ok && 'redirect' in v) {
      expect(v.redirect).toContain('error=invalid_request');
      expect(v.redirect).toContain('state=s');
    }
  });

  it('rejects plain (non-S256) PKCE', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const v = await validateAuthorizeRequest({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: 'abc',
      code_challenge_method: 'plain',
    });
    expect(v.ok).toBe(false);
  });
});

describe('consent decision', () => {
  it('denies → redirect with access_denied', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const res = await processDecision({
      client_id: clientId,
      redirect_uri: redirectUri,
      decision: 'deny',
      state: 'st',
    });
    expect(res.type).toBe('redirect');
    if (res.type === 'redirect') expect(res.url).toContain('error=access_denied');
  });

  it('wrong credentials → consent_error', async () => {
    vi.mocked(findByEmailAsync).mockResolvedValue(account);
    vi.mocked(verifyPassword).mockReturnValue(false);
    const { clientId, redirectUri } = registerTestClient();
    const { challenge } = pkce();
    const res = await processDecision({
      client_id: clientId,
      redirect_uri: redirectUri,
      decision: 'approve',
      email: 'u@example.com',
      password: 'wrong',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'courses:read',
    });
    expect(res.type).toBe('consent_error');
  });

  it('approve + valid creds → redirect with an authorization code', async () => {
    vi.mocked(findByEmailAsync).mockResolvedValue(account);
    vi.mocked(verifyPassword).mockReturnValue(true);
    const { clientId, redirectUri } = registerTestClient();
    const { challenge } = pkce();
    const res = await processDecision({
      client_id: clientId,
      redirect_uri: redirectUri,
      decision: 'approve',
      email: 'u@example.com',
      password: 'correct',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'st',
      scope: 'courses:read',
    });
    expect(res.type).toBe('redirect');
    if (res.type === 'redirect') {
      const url = new URL(res.url);
      expect(url.searchParams.get('code')).toBeTruthy();
      expect(url.searchParams.get('state')).toBe('st');
    }
  });
});

describe('token exchange (full PKCE flow)', () => {
  async function getCode(redirectUri: string, clientId: string, challenge: string) {
    vi.mocked(findByEmailAsync).mockResolvedValue(account);
    vi.mocked(verifyPassword).mockReturnValue(true);
    const res = await processDecision({
      client_id: clientId,
      redirect_uri: redirectUri,
      decision: 'approve',
      email: 'u@example.com',
      password: 'correct',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'courses:read progress:write',
    });
    if (res.type !== 'redirect') throw new Error('expected redirect');
    return new URL(res.url).searchParams.get('code')!;
  }

  it('exchanges an auth code + verifier for tokens', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const { verifier, challenge } = pkce();
    const code = await getCode(redirectUri, clientId, challenge);

    const res = await exchangeToken({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.access_token).toBe('access-jwt');
    expect(body.refresh_token).toBe('refresh-jwt');
    expect(body.token_type).toBe('Bearer');
    expect(body.scope).toBe('courses:read progress:write');
  });

  it('rejects a wrong PKCE verifier', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const { challenge } = pkce();
    const code = await getCode(redirectUri, clientId, challenge);
    const res = await exchangeToken({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: 'the-wrong-verifier',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('invalid_grant');
  });

  it('rejects auth-code reuse (one-time)', async () => {
    const { clientId, redirectUri } = registerTestClient();
    const { verifier, challenge } = pkce();
    const code = await getCode(redirectUri, clientId, challenge);
    const params = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    };
    expect((await exchangeToken(params)).status).toBe(200);
    expect((await exchangeToken(params)).status).toBe(400);
  });

  it('exchanges a refresh token for new tokens', async () => {
    const res = await exchangeToken({ grant_type: 'refresh_token', refresh_token: 'refresh-jwt' });
    expect(res.status).toBe(200);
    expect((res.body as { access_token: string }).access_token).toBe('access-jwt');
  });

  it('rejects an invalid refresh token', async () => {
    const res = await exchangeToken({ grant_type: 'refresh_token', refresh_token: 'nope' });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('invalid_grant');
  });

  it('rejects unsupported grant types', async () => {
    const res = await exchangeToken({ grant_type: 'password' });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('unsupported_grant_type');
  });
});
