import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireEmailVerified } from '../middleware/requireEmailVerified';
import { etagFromUpdatedAt, ifMatchSatisfied } from '../lib/syncEtag';
import { getSessionAsync, saveSessionAsync, type StoredSession } from '../store/sessionStore';

export const sessionRouter = Router();

sessionRouter.get('/session', authenticate, async (req: Request, res: Response) => {
  try {
    const session = await getSessionAsync(req.account!.id);
    res.setHeader('ETag', etagFromUpdatedAt(session.updatedAt));
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Session fetch failed' });
  }
});

sessionRouter.put('/session', authenticate, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const accountId = req.account!.id;
    const current = await getSessionAsync(accountId);
    if (!ifMatchSatisfied(req.header('if-match') ?? undefined, current.updatedAt)) {
      res.status(412).json({
        error: 'Precondition failed',
        code: 'ETAG_MISMATCH',
        currentUpdatedAt: current.updatedAt,
        etag: etagFromUpdatedAt(current.updatedAt),
      });
      return;
    }
    const body = req.body as Partial<StoredSession>;
    const saved = await saveSessionAsync(accountId, {
      learnerModel: body.learnerModel ?? null,
      dashboardStats: body.dashboardStats ?? null,
      tasks: body.tasks ?? [],
      xp: typeof body.xp === 'number' ? body.xp : 0,
      betaMastery: body.betaMastery ?? [],
      firstAttemptKeys: body.firstAttemptKeys ?? [],
      openMistakes: body.openMistakes ?? [],
      activities: body.activities ?? [],
      userSettings: body.userSettings ?? null,
      conceptBuses: body.conceptBuses ?? {},
      stepSchedules: body.stepSchedules ?? {},
      leitnerDeckStates: body.leitnerDeckStates ?? {},
    });
    res.setHeader('ETag', etagFromUpdatedAt(saved.updatedAt));
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Session save failed' });
  }
});
