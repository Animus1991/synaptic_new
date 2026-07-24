import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { findByIdAsync } from '../store/accounts';

/**
 * W1 — gate privileged sync writes behind email verification when enabled.
 * Anonymous accounts and non-required environments always pass.
 */
export function emailVerificationRequired(): boolean {
  const raw = process.env.EMAIL_VERIFICATION_REQUIRED;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

export async function requireEmailVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!emailVerificationRequired()) {
    next();
    return;
  }
  const account = req.account;
  if (!account) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (account.id === 'anonymous') {
    next();
    return;
  }

  // Prefer live DB/memory flag — JWT payload may be stale after verify.
  const fresh = await findByIdAsync(account.id);
  const verified = fresh?.emailVerified === true;
  if (!verified) {
    res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      hint: 'POST /auth/verify-email/request then POST /auth/verify-email with the token',
    });
    return;
  }
  next();
}

void config;
