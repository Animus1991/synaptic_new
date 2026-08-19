import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { accountStatsAsync } from '../store/accounts';
import { buildCostAbuseSummaryAsync } from '../lib/costAbuseSummary';

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

/**
 * D8 — admin cost/abuse summary. Aggregates current-month token/request spend per
 * plan, top consumers (email masked), and abuse signals (over/near quota, high
 * request volume). Same admin gate as /admin/stats; no credentials leave the server.
 */
adminRouter.get('/admin/cost-abuse', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const topN = Number(req.query.topN);
    const summary = await buildCostAbuseSummaryAsync({
      topN: Number.isFinite(topN) && topN > 0 ? Math.min(100, Math.floor(topN)) : undefined,
    });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Cost/abuse summary failed' });
  }
});
