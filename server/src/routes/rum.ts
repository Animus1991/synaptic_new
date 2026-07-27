import { Router, type Request, type Response } from 'express';

export const rumRouter = Router();

/**
 * B3 — POST /v1/rum
 * Best-effort Web Vitals ingest (LCP/INP/CLS/…). No auth; rate-limited via /v1.
 */
rumRouter.post('/rum', (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name : '';
    const route = typeof body.route === 'string' ? body.route.slice(0, 64) : 'unknown';
    const value = typeof body.value === 'number' ? body.value : Number(body.value);
    if (!name || !Number.isFinite(value)) {
      res.status(400).json({ error: 'name and numeric value required' });
      return;
    }
    // eslint-disable-next-line no-console
    console.info('[synapse] rum', {
      name,
      value,
      route,
      rating: body.rating,
      id: body.id,
    });
  } catch {
    /* never fail open badly */
  }
  res.sendStatus(204);
});
