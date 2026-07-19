import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authenticate, signAccessToken, signRefreshToken } from '../middleware/auth';
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  googleOAuthConfigured,
  scopesForMode,
  type GoogleOAuthMode,
} from '../lib/googleOAuth';
import {
  buildTokenRecord,
  consumeAuthCompletion,
  consumeOAuthState,
  createOAuthState,
  deleteGoogleTokens,
  getGoogleTokens,
  googleStatusForAccount,
  issueAuthCompletion,
  saveGoogleTokens,
} from '../store/googleTokenStore';
import { createAccountAsync, findByEmailAsync } from '../store/accounts';

export const googleAuthRouter = Router();

function parseMode(raw: unknown): GoogleOAuthMode {
  return raw === 'connect' ? 'connect' : 'signin';
}

function clientReturnUrl(returnTo?: string): string {
  const base = config.clientAppUrl;
  if (!returnTo || !returnTo.startsWith(base)) return `${base}/?view=settings&google=done`;
  return returnTo;
}

function withQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

googleAuthRouter.get('/google/start', (req, res) => {
  if (!googleOAuthConfigured()) {
    // Browser navigations expect a redirect, not a blank JSON body (503).
    const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined;
    const dest = withQueryParam(
      withQueryParam(clientReturnUrl(returnTo), 'google', 'error'),
      'reason',
      'not_configured',
    );
    res.redirect(dest);
    return;
  }
  const mode = parseMode(req.query.mode);
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined;
  let accountId: string | undefined;

  const linkToken = typeof req.query.synapse_token === 'string' ? req.query.synapse_token : '';
  const authHeader = req.headers.authorization ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : linkToken;
  if (mode === 'connect' && bearer) {
    try {
      const payload = jwt.verify(bearer, config.jwtSecret) as { sub?: string; typ?: string };
      if (!payload.typ || payload.typ === 'access') accountId = payload.sub;
    } catch {
      /* connect without valid token falls back to sign-in */
    }
  }

  const state = createOAuthState(mode, accountId, returnTo);
  const url = buildGoogleAuthUrl(state, scopesForMode(mode));
  res.redirect(url);
});

googleAuthRouter.get('/google/callback', async (req, res) => {
  if (!googleOAuthConfigured()) {
    res.status(503).send('Google OAuth not configured');
    return;
  }

  const err = typeof req.query.error === 'string' ? req.query.error : null;
  if (err) {
    res.redirect(`${config.clientAppUrl}/?view=settings&google=error&reason=${encodeURIComponent(err)}`);
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const pending = consumeOAuthState(state);
  if (!code || !pending) {
    res.redirect(`${config.clientAppUrl}/?view=settings&google=error&reason=invalid_state`);
    return;
  }

  try {
    const tokenRes = await exchangeGoogleCode(code);
    const user = await fetchGoogleUserInfo(tokenRes.access_token);
    if (!user.email) {
      res.redirect(`${config.clientAppUrl}/?view=settings&google=error&reason=no_email`);
      return;
    }

    let accountId = pending.accountId;
    if (pending.mode === 'connect' && accountId) {
      const existing = await getGoogleTokens(accountId);
      await saveGoogleTokens(buildTokenRecord(accountId, user, tokenRes, existing?.refreshToken));
      res.redirect(withQueryParam(clientReturnUrl(pending.returnTo), 'google', 'connected'));
      return;
    }

    let account = await findByEmailAsync(user.email);
    if (!account) {
      const randomPassword = randomBytes(32).toString('hex');
      account = await createAccountAsync(user.email, randomPassword);
    }

    await saveGoogleTokens(buildTokenRecord(account.id, user, tokenRes));

    const accessToken = signAccessToken(account.id);
    const refreshToken = await signRefreshToken(account.id);
    const completionCode = issueAuthCompletion({
      token: accessToken,
      refreshToken,
      email: account.email,
      plan: account.plan,
    });

    res.redirect(`${config.clientAppUrl}/?view=settings&google_auth_code=${completionCode}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed';
    res.redirect(`${config.clientAppUrl}/?view=settings&google=error&reason=${encodeURIComponent(msg.slice(0, 120))}`);
  }
});

googleAuthRouter.post('/google/complete', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const completion = consumeAuthCompletion(code);
  if (!completion) {
    res.status(401).json({ error: 'Invalid or expired Google auth code' });
    return;
  }
  res.json({
    token: completion.token,
    accessToken: completion.token,
    refreshToken: completion.refreshToken,
    account: { email: completion.email, plan: completion.plan },
  });
});

googleAuthRouter.get('/google/status', authenticate, async (req, res) => {
  res.json(await googleStatusForAccount(req.account!.id));
});

googleAuthRouter.post('/google/disconnect', authenticate, async (req, res) => {
  await deleteGoogleTokens(req.account!.id);
  res.json({ ok: true });
});
