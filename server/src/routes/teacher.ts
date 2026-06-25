import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUsage } from '../store/accounts';
import { config } from '../config';
import { getLibraryAsync } from '../store/libraryStore';
import {
  addSharedAnnotation,
  listSharedAnnotationsWithMeta,
  summarizeTeacherPublishing,
  type SharedAnnotation,
} from '../store/sharedAnnotationStore';
import { notifyAnnotationStream, registerAnnotationStream } from './annotationStream';
import { registerConceptMapCursorStream } from './conceptMapStream';

export const teacherRouter = Router();

registerAnnotationStream(teacherRouter);
registerConceptMapCursorStream(teacherRouter);

/** Public read — students merge teacher annotations in workspace (supports ?since= for polling). */
teacherRouter.get('/annotations/shared', (req, res) => {
  const courseId = String(req.query.courseId ?? '');
  const fileKey = String(req.query.fileKey ?? '');
  const since = req.query.since ? String(req.query.since) : undefined;
  if (!courseId || !fileKey) {
    res.status(400).json({ error: 'courseId and fileKey required' });
    return;
  }
  const result = listSharedAnnotationsWithMeta(courseId, fileKey, since);
  res.json(result);
});

teacherRouter.use(authenticate);

/** POST /v1/teacher/annotations — publish a teacher annotation (merged client-side with local). */
teacherRouter.post('/teacher/annotations', (req, res) => {
  const account = req.account!;
  const body = req.body as Partial<SharedAnnotation>;
  if (!body.courseId || !body.fileKey || body.lineStart === undefined) {
    res.status(400).json({ error: 'courseId, fileKey, lineStart required' });
    return;
  }
  const saved = addSharedAnnotation(body.courseId, body.fileKey, account.email, {
    type: body.type ?? 'comment',
    text: body.text ?? '',
    color: body.color ?? '#818cf8',
    lineStart: body.lineStart,
    lineEnd: body.lineEnd ?? body.lineStart,
    focusTerm: body.focusTerm,
  });
  notifyAnnotationStream(body.courseId, body.fileKey);
  res.status(201).json(saved);
});

/** GET /v1/teacher/dashboard — course + usage aggregates for instructor view. */
teacherRouter.get('/teacher/dashboard', async (req, res) => {
  const account = req.account!;
  const usage = getUsage(account);
  const quota = config.quotas[account.plan] ?? config.quotas.free;

  let courseCount = 0;
  let fileCount = 0;
  let topicCount = 0;
  let glossaryCount = 0;
  let libraryUpdatedAt: string | undefined;
  let courses: {
    id: string;
    title: string;
    topicCount: number;
    fileCount: number;
    mastery?: number;
    status?: string;
    examDate?: string;
    lastStudied?: string;
    createdAt?: string;
  }[] = [];

  try {
    const lib = await getLibraryAsync(account.id);
    libraryUpdatedAt = lib.updatedAt;
    glossaryCount = lib.glossaryEntries.length;
    fileCount = lib.uploadedFiles.length;
    const rawCourses = lib.generatedCourses as {
      id?: string;
      title?: string;
      topics?: unknown[];
      mastery?: number;
      status?: string;
      examDate?: string;
      lastStudied?: string;
      createdAt?: string;
      sourceFiles?: string[];
    }[];
    courses = rawCourses.map((c) => ({
      id: c.id ?? 'unknown',
      title: c.title ?? 'Untitled',
      topicCount: c.topics?.length ?? 0,
      fileCount: c.sourceFiles?.length ?? 0,
      mastery: c.mastery,
      status: c.status,
      examDate: c.examDate,
      lastStudied: c.lastStudied,
      createdAt: c.createdAt,
    }));
    courseCount = courses.length;
    topicCount = courses.reduce((s, c) => s + c.topicCount, 0);
  } catch {
    /* library optional */
  }

  const publishing = summarizeTeacherPublishing(account.email);

  res.json({
    account: { id: account.id, email: account.email, plan: account.plan },
    usage: {
      ...usage,
      quota,
      remainingTokens: Math.max(0, quota - usage.promptTokens - usage.completionTokens),
    },
    library: { courseCount, fileCount, topicCount, glossaryCount, updatedAt: libraryUpdatedAt },
    courses,
    publishing: {
      annotationCount: publishing.annotationCount,
      fileCount: publishing.fileCount,
      courseCount: publishing.courseCount,
      recent: publishing.recent.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        fileKey: a.fileKey,
        type: a.type,
        text: a.text.slice(0, 120),
        createdAt: a.createdAt,
      })),
    },
    features: {
      embeddings: Boolean(config.upstreamApiKey),
      rag: Boolean(config.upstreamApiKey),
      ner: true,
      dedicatedNer: Boolean(config.nerServiceUrl),
      ocr: true,
      stripe: Boolean(config.stripeSecretKey),
    },
    syncedAt: new Date().toISOString(),
  });
});
