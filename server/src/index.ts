import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { getProductionProbeStatus } from './lib/productionProbe';
import { rateLimit } from './middleware/rateLimit';
import { authRouter } from './routes/auth';
import { proxyRouter } from './routes/proxy';
import { usageRouter } from './routes/usage';
import { libraryRouter } from './routes/library';
import { sessionRouter } from './routes/session';
import { youtubeRouter } from './routes/youtube';
import { billingWebhookHandler, billingRouter } from './routes/billing';
import { adminRouter } from './routes/admin';
import { nlpRouter } from './routes/nlp';
import { ragRouter } from './routes/rag';
import { teacherRouter } from './routes/teacher';
import { orgRouter } from './routes/org';
import { ltiRouter } from './routes/lti';
import { audioRouter } from './routes/audio';
import { studentRouter } from './routes/student';
import { ocrRouter } from './routes/ocr';
import { transcribeRouter } from './routes/transcribe';
import { chunkErrorsRouter } from './routes/chunkErrors';
import { googleAuthRouter } from './routes/googleAuth';
import { googleIntegrationsRouter } from './routes/googleIntegrations';
import { googleCalendarRouter } from './routes/googleCalendar';
import { accountRouter } from './routes/account';
import { studyRoomsRouter } from './routes/studyRooms';
import { bootstrapStudyRoomsFromPg } from './store/studyRoomPgStore';
import { initVectorIndexQueue } from './jobs/vectorIndexQueue';
import { initTranscribeQueue } from './jobs/transcribeQueue';
import { auditLogMiddleware } from './middleware/auditLog';
import { startStudyRoomCollab } from './collab/studyRoomCollab';

export function createApp(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
      credentials: true,
    }),
  );

  app.post('/v1/billing/webhook', express.raw({ type: 'application/json' }), billingWebhookHandler);
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));

  app.get('/health', async (_req, res) => {
    const production = await getProductionProbeStatus();
    res.json({
      ok: true,
      upstream: config.upstreamBaseUrl,
      anonymous: config.allowAnonymous,
      database: production.database,
      production,
      multiTenant: production.tenantIsolation,
      features: {
        embeddings: Boolean(config.upstreamApiKey),
        rag: Boolean(config.upstreamApiKey),
        ner: true,
        refreshTokens: true,
        ocr: true,
        rateLimitRpm: config.rateLimitRpm,
        rateLimitBackend: production.rateLimit.backend,
        rateLimitDistributed: production.rateLimit.distributed,
        rateLimitRequireRedis: production.rateLimit.requireRedis,
        googleOAuth: Boolean(config.googleClientId && config.googleClientSecret),
        studyRooms: true,
        vectorIndexQueue: production.vectorIndexQueue,
        pgvectorRag: production.pgvector,
        collab: true,
        collabWebSocketUrl: `ws://localhost:${config.collabPort}`,
        l4Enterprise: production.l4Enterprise,
        l6Enterprise: production.l6Enterprise,
        l7Enterprise: production.l7Enterprise,
        l8Enterprise: production.l8Enterprise,
        l9Enterprise: production.l9Enterprise,
        l10Enterprise: production.l10Enterprise,
        l11Enterprise: production.l11Enterprise,
        l12Enterprise: production.l12Enterprise,
        l13Enterprise: production.l13Enterprise,
      },
    });
  });

  app.use('/auth', authRouter);
  app.use('/auth', googleAuthRouter);
  app.use('/v1', rateLimit);
  app.use('/v1', auditLogMiddleware);
  app.use('/v1', usageRouter);
  app.use('/v1', libraryRouter);
  app.use('/v1', sessionRouter);
  app.use('/v1', youtubeRouter);
  app.use('/v1', billingRouter);
  app.use('/v1', adminRouter);
  app.use('/v1', nlpRouter);
  app.use('/v1', ragRouter);
  app.use('/v1', ocrRouter);
  app.use('/v1', transcribeRouter);
  app.use('/v1', teacherRouter);
  app.use('/v1', orgRouter);
  app.use('/v1', ltiRouter);
  app.use('/v1', audioRouter);
  app.use('/v1', studentRouter);
  app.use('/v1', googleIntegrationsRouter);
  app.use('/v1', googleCalendarRouter);
  app.use('/v1', accountRouter);
  app.use('/v1', studyRoomsRouter);
  app.use('/v1', proxyRouter);

  app.use(chunkErrorsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

export const app = createApp();

export async function startServer(): Promise<void> {
  if (config.databaseUrl && config.runMigrationsOnStart) {
    await runMigrations(config.databaseUrl);
  }
  await bootstrapStudyRoomsFromPg(config.databaseUrl);
  initVectorIndexQueue();
  initTranscribeQueue();

  const production = await getProductionProbeStatus();
  if (production.database) {
    console.log(`[synapse-proxy] pgvector RAG: ${production.pgvector ? 'ready' : 'unavailable'}`);
  }
  if (production.redis) {
    console.log('[synapse-proxy] Redis: connected (rate limit + BullMQ)');
  } else if (config.redisUrl && config.rateLimitRequireRedis) {
    console.warn(
      '[synapse-proxy] REDIS_URL is set but Redis is unreachable — rate limiting will return 503 until Redis is available',
    );
  }

  app.listen(config.port, () => {
    console.log(`[synapse-proxy] listening on http://localhost:${config.port}`);
    console.log(`[synapse-proxy] upstream: ${config.upstreamBaseUrl} · anonymous: ${config.allowAnonymous}`);
    if (config.databaseUrl) {
      console.log(`[synapse-proxy] database: connected · migrations-on-start: ${config.runMigrationsOnStart}`);
    }
    if (config.redisUrl) {
      console.log('[synapse-proxy] vector index queue: BullMQ (Redis)');
    }
    if (process.env.NODE_ENV !== 'test') {
      startStudyRoomCollab(config.collabPort, config.databaseUrl);
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[synapse-proxy] failed to start:', err);
    process.exit(1);
  });
}
