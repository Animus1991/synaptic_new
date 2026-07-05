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
  addClassEnrollmentAsync,
  createTeacherClassAsync,
  listClassRosterAsync,
  listTeacherClassesAsync,
  removeClassEnrollmentAsync,
  rosterCountAsync,
} from '../store/classStore';
import { requireTeacherClass } from '../lib/tenantGuard';
import {
  createClassAssignmentAsync,
  listClassAssignmentsAsync,
  removeClassAssignmentAsync,
  updateClassAssignmentAsync,
} from '../store/assignmentStore';
import {
  getGradebookAsync,
  removeGradebookCellsForAssignmentAsync,
  removeGradebookCellsForEnrollmentAsync,
  upsertGradebookCellAsync,
} from '../store/gradebookStore';
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

/** GET /v1/teacher/classes — instructor classes (Postgres when DATABASE_URL set). */
teacherRouter.get('/teacher/classes', async (req, res) => {
  const account = req.account!;
  const classes = await listTeacherClassesAsync(account.id);
  const rows = await Promise.all(
    classes.map(async (c) => ({
      ...c,
      studentCount: await rosterCountAsync(c.id),
    })),
  );
  res.json({ classes: rows });
});

/** POST /v1/teacher/classes — create a class roster bucket. */
teacherRouter.post('/teacher/classes', async (req, res) => {
  const account = req.account!;
  const body = req.body as { name?: string; courseId?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const created = await createTeacherClassAsync(account.id, {
    name: body.name.trim(),
    courseId: body.courseId?.trim(),
  });
  res.status(201).json(created);
});

/** GET /v1/teacher/classes/:classId/roster */
teacherRouter.get('/teacher/classes/:classId/roster', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const roster = await listClassRosterAsync(owned.class.id);
  res.json({ class: owned.class, roster });
});

/** POST /v1/teacher/classes/:classId/roster — enroll student by email. */
teacherRouter.post('/teacher/classes/:classId/roster', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as { email?: string; displayName?: string; mastery?: number };
  if (!body.email?.trim()) {
    res.status(400).json({ error: 'email required' });
    return;
  }
  const row = await addClassEnrollmentAsync(owned.class.id, {
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
teacherRouter.delete('/teacher/classes/:classId/roster/:enrollmentId', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const ok = await removeClassEnrollmentAsync(owned.class.id, req.params.enrollmentId);
  if (!ok) {
    res.status(404).json({ error: 'enrollment not found' });
    return;
  }
  await removeGradebookCellsForEnrollmentAsync(owned.class.id, req.params.enrollmentId);
  res.status(204).send();
});

/** GET /v1/teacher/classes/:classId/assignments */
teacherRouter.get('/teacher/classes/:classId/assignments', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const assignments = await listClassAssignmentsAsync(owned.class.id);
  res.json({ classId: owned.class.id, assignments });
});

/** POST /v1/teacher/classes/:classId/assignments */
teacherRouter.post('/teacher/classes/:classId/assignments', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as { title?: string; description?: string; dueAt?: string; courseId?: string };
  if (!body.title?.trim()) {
    res.status(400).json({ error: 'title required' });
    return;
  }
  const created = await createClassAssignmentAsync(owned.class.id, {
    title: body.title,
    description: body.description,
    dueAt: body.dueAt,
    courseId: body.courseId,
  });
  res.status(201).json(created);
});

/** PATCH /v1/teacher/classes/:classId/assignments/:assignmentId */
teacherRouter.patch('/teacher/classes/:classId/assignments/:assignmentId', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as { title?: string; description?: string; dueAt?: string; courseId?: string };
  const updated = await updateClassAssignmentAsync(owned.class.id, req.params.assignmentId, body);
  if (!updated) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  res.json(updated);
});

/** DELETE /v1/teacher/classes/:classId/assignments/:assignmentId */
teacherRouter.delete('/teacher/classes/:classId/assignments/:assignmentId', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const ok = await removeClassAssignmentAsync(owned.class.id, req.params.assignmentId);
  if (!ok) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  await removeGradebookCellsForAssignmentAsync(owned.class.id, req.params.assignmentId);
  res.status(204).send();
});

/** GET /v1/teacher/classes/:classId/gradebook — student × assignment score matrix. */
teacherRouter.get('/teacher/classes/:classId/gradebook', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const [roster, assignments, gradebook] = await Promise.all([
    listClassRosterAsync(owned.class.id),
    listClassAssignmentsAsync(owned.class.id),
    getGradebookAsync(owned.class.id),
  ]);
  res.json({
    classId: owned.class.id,
    roster,
    assignments,
    cells: gradebook.cells,
  });
});

/** PATCH /v1/teacher/classes/:classId/gradebook — upsert a grade cell. */
teacherRouter.patch('/teacher/classes/:classId/gradebook', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as {
    enrollmentId?: string;
    assignmentId?: string;
    status?: 'pending' | 'submitted' | 'graded';
    score?: number;
  };
  if (!body.enrollmentId?.trim() || !body.assignmentId?.trim()) {
    res.status(400).json({ error: 'enrollmentId and assignmentId required' });
    return;
  }
  const [roster, assignments] = await Promise.all([
    listClassRosterAsync(owned.class.id),
    listClassAssignmentsAsync(owned.class.id),
  ]);
  if (!roster.some((r) => r.id === body.enrollmentId)) {
    res.status(404).json({ error: 'enrollment not found' });
    return;
  }
  if (!assignments.some((a) => a.id === body.assignmentId)) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  const cell = await upsertGradebookCellAsync(owned.class.id, {
    enrollmentId: body.enrollmentId,
    assignmentId: body.assignmentId,
    status: body.status,
    score: body.score,
  });
  res.json(cell);
});

/** GET /v1/teacher/classes/:classId/gradebook/export.csv — grade export for LMS import. */
teacherRouter.get('/teacher/classes/:classId/gradebook/export.csv', async (req, res) => {
  const account = req.account!;
  const owned = await requireTeacherClass(req.params.classId, account.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const [roster, assignments, gradebook] = await Promise.all([
    listClassRosterAsync(owned.class.id),
    listClassAssignmentsAsync(owned.class.id),
    getGradebookAsync(owned.class.id),
  ]);
  const header = ['Student', 'Email', ...assignments.map((a) => a.title), 'Overall Mastery'];
  const lines = [header.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];
  for (const student of roster) {
    const cols = [
      student.displayName ?? student.studentEmail,
      student.studentEmail,
      ...assignments.map((a) => {
        const cell = gradebook.cells.find(
          (c) => c.enrollmentId === student.id && c.assignmentId === a.id,
        );
        if (cell?.score != null) return String(cell.score);
        return cell?.status ?? '';
      }),
      student.mastery != null ? String(student.mastery) : '',
    ];
    lines.push(cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }
  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="gradebook-${owned.class.id}.csv"`,
  );
  res.send(`\uFEFF${csv}`);
});
