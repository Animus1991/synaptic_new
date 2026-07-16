/**
 * MCP OAuth 2.1 authorization server (public PKCE clients, no secrets).
 *
 * Endpoints:
 *   GET  /.well-known/oauth-protected-resource   (RFC 9728)
 *   GET  /.well-known/oauth-authorization-server  (RFC 8414)
 *   POST /oauth/register                          (RFC 7591 Dynamic Client Registration)
 *   GET  /oauth/authorize                         (renders consent screen)
 *   POST /oauth/authorize/decision                (login + approve/deny → code)
 *   POST /oauth/token                             (authorization_code + refresh_token)
 *
 * Access tokens are the same JWTs the REST API uses, so /mcp accepts them via
 * the existing `authenticate` middleware with zero extra wiring.
 */
import { Router, type Request, type Response } from 'express';
import { findByEmailAsync, verifyPassword } from '../../store/accounts';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../middleware/auth';
import {
  consumeAuthCode,
  getClient,
  getClientAsync,
  isRegisteredRedirectUriAsync,
  issueAuthCode,
  registerClient,
} from './store';
import {
  authorizationServerMetadata,
  protectedResourceMetadata,
  sanitizeScope,
} from './metadata';
import { renderConsentPage } from './consent';

export const oauthRouter = Router();
export const wellKnownRouter = Router();

/** Access-token lifetime advertised in token responses (seconds). */
export const ACCESS_TOKEN_EXPIRES_IN = 900;

// --- Discovery -------------------------------------------------------------

wellKnownRouter.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.json(protectedResourceMetadata());
});
// Some clients probe the path-suffixed variant.
wellKnownRouter.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
  res.json(protectedResourceMetadata());
});
wellKnownRouter.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.json(authorizationServerMetadata());
});

// --- Dynamic Client Registration (RFC 7591) --------------------------------

export function processRegistration(body: unknown):
  | { status: 201; body: Record<string, unknown> }
  | { status: 400; body: Record<string, unknown> } {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const redirectUris = Array.isArray(b.redirect_uris)
    ? b.redirect_uris.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
    : [];
  if (redirectUris.length === 0) {
    return { status: 400, body: { error: 'invalid_redirect_uri', error_description: 'redirect_uris required' } };
  }
  const client = registerClient({
    redirectUris,
    clientName: typeof b.client_name === 'string' ? b.client_name : undefined,
    scope: typeof b.scope === 'string' ? sanitizeScope(b.scope) : undefined,
  });
  return {
    status: 201,
    body: {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt / 1000),
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: client.clientName,
      scope: client.scope,
    },
  };
}

oauthRouter.post('/oauth/register', (req, res) => {
  const result = processRegistration(req.body);
  res.status(result.status).json(result.body);
});

// --- Authorization endpoint ------------------------------------------------

export interface AuthorizeRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
}

export type AuthorizeValidation =
  | { ok: true; request: AuthorizeRequest }
  | { ok: false; redirect: string }
  | { ok: false; fatal: string };

function q(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Validate an /oauth/authorize request. Client/redirect errors are fatal (shown
 * to the user, not redirected). Other errors redirect back per OAuth spec.
 */
export async function validateAuthorizeRequest(
  query: Record<string, unknown>,
): Promise<AuthorizeValidation> {
  const clientId = q(query.client_id);
  const redirectUri = q(query.redirect_uri);

  const client = clientId ? await getClientAsync(clientId) : undefined;
  if (!clientId || !client) {
    return { ok: false, fatal: 'Unknown client_id' };
  }
  if (!redirectUri || !(await isRegisteredRedirectUriAsync(clientId, redirectUri))) {
    return { ok: false, fatal: 'redirect_uri is not registered for this client' };
  }

  const state = q(query.state);
  const responseType = q(query.response_type);
  const codeChallenge = q(query.code_challenge);
  const codeChallengeMethod = q(query.code_challenge_method) || 'S256';

  const redirectError = (error: string): AuthorizeValidation => {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    if (state) url.searchParams.set('state', state);
    return { ok: false, redirect: url.toString() };
  };

  if (responseType !== 'code') return redirectError('unsupported_response_type');
  if (!codeChallenge) return redirectError('invalid_request');
  if (codeChallengeMethod !== 'S256') return redirectError('invalid_request');

  return {
    ok: true,
    request: {
      responseType,
      clientId,
      redirectUri,
      scope: sanitizeScope(q(query.scope)),
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
      resource: q(query.resource),
    },
  };
}

oauthRouter.get('/oauth/authorize', async (req: Request, res: Response) => {
  const validation = await validateAuthorizeRequest(req.query as Record<string, unknown>);
  if (!validation.ok) {
    if ('fatal' in validation) {
      res.status(400).send(`OAuth error: ${validation.fatal}`);
      return;
    }
    res.redirect(validation.redirect);
    return;
  }
  const r = validation.request;
  const client = (await getClientAsync(r.clientId))!;
  res.type('html').send(
    renderConsentPage({
      clientId: r.clientId,
      clientName: client.clientName || r.clientId,
      redirectUri: r.redirectUri,
      state: r.state,
      scope: r.scope,
      codeChallenge: r.codeChallenge,
      codeChallengeMethod: r.codeChallengeMethod,
      resource: r.resource,
    }),
  );
});

// --- Consent decision ------------------------------------------------------

export type DecisionResult =
  | { type: 'redirect'; url: string }
  | { type: 'consent_error'; message: string }
  | { type: 'fatal'; message: string };

export async function processDecision(body: Record<string, unknown>): Promise<DecisionResult> {
  const clientId = q(body.client_id);
  const redirectUri = q(body.redirect_uri);
  if (!clientId || !(await getClientAsync(clientId))) return { type: 'fatal', message: 'Unknown client_id' };
  if (!(await isRegisteredRedirectUriAsync(clientId, redirectUri))) {
    return { type: 'fatal', message: 'redirect_uri is not registered for this client' };
  }

  const state = q(body.state);
  const scope = sanitizeScope(q(body.scope));
  const codeChallenge = q(body.code_challenge);
  const codeChallengeMethod = q(body.code_challenge_method) || 'S256';
  const decision = q(body.decision);

  const redirectWith = (params: Record<string, string>): string => {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (state) url.searchParams.set('state', state);
    return url.toString();
  };

  if (decision !== 'approve') {
    return { type: 'redirect', url: redirectWith({ error: 'access_denied' }) };
  }
  if (codeChallengeMethod !== 'S256' || !codeChallenge) {
    return { type: 'redirect', url: redirectWith({ error: 'invalid_request' }) };
  }

  const email = q(body.email).trim().toLowerCase();
  const password = q(body.password);
  const account = email ? await findByEmailAsync(email) : undefined;
  if (!account || !verifyPassword(account, password)) {
    return { type: 'consent_error', message: 'Invalid email or password.' };
  }

  const code = issueAuthCode({
    clientId,
    accountId: account.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: 'S256',
    scope,
  });
  return { type: 'redirect', url: redirectWith({ code }) };
}

oauthRouter.post('/oauth/authorize/decision', async (req: Request, res: Response) => {
  const result = await processDecision(req.body as Record<string, unknown>);
  if (result.type === 'redirect') {
    res.redirect(result.url);
    return;
  }
  if (result.type === 'consent_error') {
    const b = req.body as Record<string, unknown>;
    res.status(401).type('html').send(
      renderConsentPage({
        clientId: q(b.client_id),
        clientName: getClient(q(b.client_id))?.clientName || q(b.client_id),
        redirectUri: q(b.redirect_uri),
        state: q(b.state),
        scope: sanitizeScope(q(b.scope)),
        codeChallenge: q(b.code_challenge),
        codeChallengeMethod: q(b.code_challenge_method) || 'S256',
        resource: q(b.resource),
        error: result.message,
      }),
    );
    return;
  }
  res.status(400).send(`OAuth error: ${result.message}`);
});

// --- Token endpoint --------------------------------------------------------

export type TokenResult =
  | { status: 200; body: Record<string, unknown> }
  | { status: 400 | 401; body: { error: string; error_description?: string } };

export async function exchangeToken(body: Record<string, unknown>): Promise<TokenResult> {
  const grantType = q(body.grant_type);

  if (grantType === 'authorization_code') {
    const code = q(body.code);
    const clientId = q(body.client_id);
    const redirectUri = q(body.redirect_uri);
    const codeVerifier = q(body.code_verifier);
    if (!code || !clientId || !redirectUri || !codeVerifier) {
      return { status: 400, body: { error: 'invalid_request', error_description: 'missing parameters' } };
    }
    const result = consumeAuthCode({ code, clientId, redirectUri, codeVerifier });
    if ('error' in result) return { status: 400, body: { error: result.error } };

    const accessToken = signAccessToken(result.accountId);
    const refreshToken = await signRefreshToken(result.accountId);
    return {
      status: 200,
      body: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        refresh_token: refreshToken,
        scope: result.scope,
      },
    };
  }

  if (grantType === 'refresh_token') {
    const raw = q(body.refresh_token);
    const accountId = await verifyRefreshToken(raw);
    if (!accountId) return { status: 400, body: { error: 'invalid_grant' } };
    const accessToken = signAccessToken(accountId);
    const refreshToken = await signRefreshToken(accountId);
    return {
      status: 200,
      body: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        refresh_token: refreshToken,
      },
    };
  }

  return { status: 400, body: { error: 'unsupported_grant_type' } };
}

oauthRouter.post('/oauth/token', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const result = await exchangeToken((req.body ?? {}) as Record<string, unknown>);
  res.status(result.status).json(result.body);
});
