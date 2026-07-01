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
import {
  addClassEnrollment,
  createTeacherClass,
  getTeacherClass,
  listClassRoster,
  listTeacherClasses,
  removeClassEnrollment,
} from '../store/classStore';
import {
  createClassAssignment,
  listClassAssignments,
  removeClassAssignment,
  updateClassAssignment,
} from '../store/assignmentStore';
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

/** GET /v1/teacher/classes — instructor classes (in-memory dev store). */
teacherRouter.get('/teacher/classes', (req, res) => {
  const account = req.account!;
  const rows = listTeacherClasses(account.id).map((c) => ({
    ...c,
    studentCount: listClassRoster(c.id).length,
  }));
  res.json({ classes: rows });
});

/** POST /v1/teacher/classes — create a class roster bucket. */
teacherRouter.post('/teacher/classes', (req, res) => {
  const account = req.account!;
  const body = req.body as { name?: string; courseId?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const created = createTeacherClass(account.id, {
    name: body.name.trim(),
    courseId: body.courseId?.trim(),
  });
  res.status(201).json(created);
});

/** GET /v1/teacher/classes/:classId/roster */
teacherRouter.get('/teacher/classes/:classId/roster', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  res.json({ class: cls, roster: listClassRoster(cls.id) });
});

/** POST /v1/teacher/classes/:classId/roster — enroll student by email. */
teacherRouter.post('/teacher/classes/:classId/roster', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const body = req.body as { email?: string; displayName?: string; mastery?: number };
  if (!body.email?.trim()) {
    res.status(400).json({ error: 'email required' });
    return;
  }
  const row = addClassEnrollment(cls.id, {
    email: body.email,
    displayName: body.displayName,
    mastery: body.mastery,
  });
  if (!row) {
    res.status(400).json({ error: 'invalid enrollment' });
    return;
  }
  res.status(201).json(row);
});

/** DELETE /v1/teacher/classes/:classId/roster/:enrollmentId */
teacherRouter.delete('/teacher/classes/:classId/roster/:enrollmentId', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const ok = removeClassEnrollment(cls.id, req.params.enrollmentId);
  if (!ok) {
    res.status(404).json({ error: 'enrollment not found' });
    return;
  }
  res.status(204).send();
});

/** GET /v1/teacher/classes/:classId/assignments */
teacherRouter.get('/teacher/classes/:classId/assignments', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  res.json({ classId: cls.id, assignments: listClassAssignments(cls.id) });
});

/** POST /v1/teacher/classes/:classId/assignments */
teacherRouter.post('/teacher/classes/:classId/assignments', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const body = req.body as { title?: string; description?: string; dueAt?: string; courseId?: string };
  if (!body.title?.trim()) {
    res.status(400).json({ error: 'title required' });
    return;
  }
  const created = createClassAssignment(cls.id, {
    title: body.title,
    description: body.description,
    dueAt: body.dueAt,
    courseId: body.courseId,
  });
  res.status(201).json(created);
});

/** PATCH /v1/teacher/classes/:classId/assignments/:assignmentId */
teacherRouter.patch('/teacher/classes/:classId/assignments/:assignmentId', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const body = req.body as { title?: string; description?: string; dueAt?: string; courseId?: string };
  const updated = updateClassAssignment(cls.id, req.params.assignmentId, body);
  if (!updated) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  res.json(updated);
});

/** DELETE /v1/teacher/classes/:classId/assignments/:assignmentId */
teacherRouter.delete('/teacher/classes/:classId/assignments/:assignmentId', (req, res) => {
  const account = req.account!;
  const cls = getTeacherClass(req.params.classId, account.id);
  if (!cls) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const ok = removeClassAssignment(cls.id, req.params.assignmentId);
  if (!ok) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  res.status(204).send();
});
