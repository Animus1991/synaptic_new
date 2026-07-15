import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { accountStatsAsync } from '../store/accounts';

export const adminRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET?.trim();
  const header = req.headers['x-admin-secret'];
  if (secret && header === secret) {
    next();
    return;
  }
  // Never treat arbitrary authenticated users as admin when ADMIN_SECRET is unset.
  // Dev-only bypass: only when NODE_ENV is not production AND caller is non-anonymous.
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (!isProd && !secret && req.account?.email && req.account.email !== 'anonymous@local') {
    next();
    return;
  }
  res.status(403).json({
    error: isProd && !secret
      ? 'Admin access denied — set ADMIN_SECRET in production'
      : 'Admin access denied',
  });
}

adminRouter.get('/admin/stats', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({
      accounts: await accountStatsAsync(),
      uptimeSeconds: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV ?? 'development',
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Stats failed' });
  }
});
