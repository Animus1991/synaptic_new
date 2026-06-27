import { Router, type Request, type Response } from 'express';

export const chunkErrorsRouter = Router();

/** POST /__chunk_errors — best-effort beacon from chunkErrorReporter (A4). */
chunkErrorsRouter.post('/__chunk_errors', (req: Request, res: Response) => {
  try {
    const payload = (req.body ?? {}) as Record<string, unknown>;
    // eslint-disable-next-line no-console
    console.info('[synapse] chunk-error beacon', {
      flow: payload.flow,
      version: payload.version,
      attempt: payload.attempt,
      willReload: payload.willReload,
      url: payload.url,
      message: payload.message,
    });
  } catch {
    /* logging must never fail the ingest */
  }
  res.sendStatus(204);
});
