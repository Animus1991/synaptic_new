import { Router } from 'express';
import { authenticate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import {
  createAccountAsync,
  findByEmailAsync,
  findByIdAsync,
  getUsage,
  markEmailVerifiedAsync,
  needsPasswordRehash,
  updatePasswordAsync,
  verifyPassword,
} from '../store/accounts';
import {
  consumeToken,
  issueToken,
  listRefreshSessions,
  revokeOtherRefreshSessions,
  revokeSessionById,
} from '../store/tokenStore';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../lib/email';

export const authRouter = Router();

function clientMeta(req: { headers: Record<string, unknown>; ip?: string }) {
  const ua = req.headers['user-agent'];
  return {
    userAgent: typeof ua === 'string' ? ua.slice(0, 512) : undefined,
    ip: typeof req.ip === 'string' ? req.ip : undefined,
  };
}

function validCredentials(body: unknown): { email: string; password: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) return null;
  return { email, password };
}

async function authPayloadWithRefresh(
  account: { id: string; email: string; plan: string; emailVerified?: boolean },
  meta?: { userAgent?: string; ip?: string },
) {
  const accessToken = signAccessToken(account.id);
  const refresh = await signRefreshToken(account.id, meta);
  return {
    token: accessToken,
    accessToken,
    refreshToken: refresh.token,
    sessionId: refresh.sessionId,
    account: {
      id: account.id,
      email: account.email,
      plan: account.plan,
      emailVerified: account.emailVerified === true,
    },
  };
}

authRouter.post('/register', async (req, res) => {
  const creds = validCredentials(req.body);
  if (!creds) {
    res.status(400).json({ error: 'Valid email and password (min 8 chars) required' });
    return;
  }
  try {
    const account = await createAccountAsync(creds.email, creds.password);
    res.status(201).json(await authPayloadWithRefresh(account, clientMeta(req)));
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

authRouter.post('/login', async (req, res) => {
  const creds = validCredentials(req.body);
  if (!creds) {
    res.status(400).json({ error: 'Valid email and password required' });
    return;
  }
  const account = await findByEmailAsync(creds.email);
  if (!account || !verifyPassword(account, creds.password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (needsPasswordRehash(account)) {
    void updatePasswordAsync(account.id, creds.password).catch(() => undefined);
  }
  res.json(await authPayloadWithRefresh(account, clientMeta(req)));
});

authRouter.post('/refresh', async (req, res) => {
  const raw = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  const accountId = await verifyRefreshToken(raw);
  if (!accountId) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }
  const accessToken = signAccessToken(accountId);
  const refresh = await signRefreshToken(accountId, clientMeta(req));
  res.json({
    token: accessToken,
    accessToken,
    refreshToken: refresh.token,
    sessionId: refresh.sessionId,
  });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  if (sessionId && req.account && req.account.id !== 'anonymous') {
    await revokeSessionById(req.account.id, sessionId);
  }
  res.json({ ok: true });
});

authRouter.get('/sessions', authenticate, async (req, res) => {
  const account = req.account!;
  if (account.id === 'anonymous') {
    res.status(400).json({ error: 'Anonymous accounts have no sessions' });
    return;
  }
  const currentSessionId =
    typeof req.query.currentSessionId === 'string' ? req.query.currentSessionId : undefined;
  const sessions = await listRefreshSessions(account.id, currentSessionId);
  res.json({ sessions });
});

authRouter.delete('/sessions/:id', authenticate, async (req, res) => {
  const account = req.account!;
  if (account.id === 'anonymous') {
    res.status(400).json({ error: 'Anonymous accounts have no sessions' });
    return;
  }
  const ok = await revokeSessionById(account.id, req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ ok: true });
});

authRouter.post('/sessions/revoke-others', authenticate, async (req, res) => {
  const account = req.account!;
  if (account.id === 'anonymous') {
    res.status(400).json({ error: 'Anonymous accounts have no sessions' });
    return;
  }
  const keepSessionId =
    typeof req.body?.keepSessionId === 'string' ? req.body.keepSessionId : '';
  if (!keepSessionId) {
    res.status(400).json({ error: 'keepSessionId required' });
    return;
  }
  const revoked = await revokeOtherRefreshSessions(account.id, keepSessionId);
  res.json({ ok: true, revoked });
});

authRouter.post('/forgot-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    res.status(400).json({ error: 'email required' });
    return;
  }
  const account = await findByEmailAsync(email);
  if (account) {
    const { raw: resetToken } = await issueToken(account.id, 'password_reset', 60 * 60 * 1000);
    await sendPasswordResetEmail(account.email, resetToken);
    if (process.env.NODE_ENV !== 'production') {
      res.json({ ok: true, resetToken });
      return;
    }
  }
  res.json({ ok: true });
});

authRouter.post('/reset-password', async (req, res) => {
  const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!resetToken || password.length < 8) {
    res.status(400).json({ error: 'resetToken and password (min 8) required' });
    return;
  }
  const accountId = await consumeToken(resetToken, 'password_reset');
  if (!accountId) {
    res.status(401).json({ error: 'Invalid or expired reset token' });
    return;
  }
  const ok = await updatePasswordAsync(accountId, password);
  if (!ok) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const account = req.account!;
  const fresh = (await findByIdAsync(account.id)) ?? account;
  res.json({
    account: {
      id: fresh.id,
      email: fresh.email,
      plan: fresh.plan,
      emailVerified: fresh.emailVerified === true,
    },
    usage: getUsage(fresh),
  });
});

/** W1 — request email verification token (dev returns token in body). */
authRouter.post('/verify-email/request', authenticate, async (req, res) => {
  const account = req.account!;
  if (account.id === 'anonymous') {
    res.status(400).json({ error: 'Anonymous accounts cannot verify email' });
    return;
  }
  const fresh = await findByIdAsync(account.id);
  if (!fresh) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  if (fresh.emailVerified) {
    res.json({ ok: true, alreadyVerified: true });
    return;
  }
  const { raw: verifyToken } = await issueToken(fresh.id, 'email_verify', 24 * 60 * 60 * 1000);
  await sendEmailVerificationEmail(fresh.email, verifyToken);
  if (process.env.NODE_ENV !== 'production') {
    res.json({ ok: true, verifyToken });
    return;
  }
  res.json({ ok: true });
});

authRouter.post('/verify-email', async (req, res) => {
  const verifyToken = typeof req.body?.verifyToken === 'string' ? req.body.verifyToken : '';
  if (!verifyToken) {
    res.status(400).json({ error: 'verifyToken required' });
    return;
  }
  const accountId = await consumeToken(verifyToken, 'email_verify');
  if (!accountId) {
    res.status(401).json({ error: 'Invalid or expired verification token' });
    return;
  }
  const account = await markEmailVerifiedAsync(accountId);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      plan: account.plan,
      emailVerified: true,
    },
  });
});
