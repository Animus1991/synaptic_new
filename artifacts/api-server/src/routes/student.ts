import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listStudentClassesAsync,
  getStudentEnrollmentAsync,
} from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
import { listStudentAnnouncementsAsync } from '../store/announcementStore';
import {
  createAssignmentDiscussionPostAsync,
  listAssignmentDiscussionAsync,
  removeAssignmentDiscussionPostAsync,
  validateDiscussionParentPostId,
} from '../store/discussionStore';
import { getGradebookAsync } from '../store/gradebookStore';
import { listOrgsForAccountAsync, getOrgMembershipAsync } from '../store/orgStore';
import { computeStudentDashboardAsync } from '../lib/studentDashboard';

export const studentRouter = Router();

studentRouter.use(authenticate);

/** GET /v1/student/classes — classes where the signed-in account email is enrolled. */
studentRouter.get('/student/classes', async (req, res) => {
  const account = req.account!;
  const rows = await listStudentClassesAsync(account.email);
  const classes = await Promise.all(
    rows.map(async ({ enrollment, class: cls }) => {
      const assignments = await listClassAssignmentsAsync(cls.id);
      const gradebook = await getGradebookAsync(cls.id);
      const myCells = gradebook.cells.filter((c) => c.enrollmentId === enrollment.id);
      return {
        class: cls,
        enrollment,
        assignments,
        gradeCells: myCells,
      };
    }),
  );
  res.json({ email: account.email, classes });
});

/** GET /v1/student/orgs — org memberships for the signed-in student/teacher. */
studentRouter.get('/student/orgs', async (req, res) => {
  const account = req.account!;
  const orgs = await listOrgsForAccountAsync(account.id);
  const rows = await Promise.all(
    orgs.map(async (org) => {
      const membership = await getOrgMembershipAsync(org.id, account.id);
      return { org, membership };
    }),
  );
  res.json({ orgs: rows });
});

/** GET /v1/student/dashboard — Canvas-style student org summary (classes, grades, upcoming). */
studentRouter.get('/student/dashboard', async (req, res) => {
  const account = req.account!;
  const snapshot = await computeStudentDashboardAsync(account.id, account.email);
  res.json(snapshot);
});

/** GET /v1/student/announcements — merged feed across enrolled classes. */
studentRouter.get('/student/announcements', async (req, res) => {
  const account = req.account!;
  const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
  let announcements = await listStudentAnnouncementsAsync(account.email);
  if (classId) {
    announcements = announcements.filter((a) => a.classId === classId);
  }
  res.json({ email: account.email, announcements });
});

/** GET /v1/student/classes/:classId/assignments/:assignmentId/discussion */
studentRouter.get(
  '/student/classes/:classId/assignments/:assignmentId/discussion',
  async (req, res) => {
    const account = req.account!;
    const enrollment = await getStudentEnrollmentAsync(req.params.classId, account.email);
    if (!enrollment) {
      res.status(404).json({ error: 'class not found' });
      return;
    }
    const assignments = await listClassAssignmentsAsync(req.params.classId);
    if (!assignments.some((a) => a.id === req.params.assignmentId)) {
      res.status(404).json({ error: 'assignment not found' });
      return;
    }
    const posts = await listAssignmentDiscussionAsync(req.params.classId, req.params.assignmentId);
    res.json({
      classId: req.params.classId,
      assignmentId: req.params.assignmentId,
      posts,
    });
  },
);

/** POST /v1/student/classes/:classId/assignments/:assignmentId/discussion */
studentRouter.post(
  '/student/classes/:classId/assignments/:assignmentId/discussion',
  async (req, res) => {
    const account = req.account!;
    const enrollment = await getStudentEnrollmentAsync(req.params.classId, account.email);
    if (!enrollment) {
      res.status(404).json({ error: 'class not found' });
      return;
    }
    const assignments = await listClassAssignmentsAsync(req.params.classId);
    if (!assignments.some((a) => a.id === req.params.assignmentId)) {
      res.status(404).json({ error: 'assignment not found' });
      return;
    }
    const body = req.body as { body?: string; parentPostId?: string };
    if (!body.body?.trim()) {
      res.status(400).json({ error: 'body required' });
      return;
    }
    const existingPosts = await listAssignmentDiscussionAsync(req.params.classId, req.params.assignmentId);
    const parentPostId = body.parentPostId?.trim();
    if (parentPostId) {
      const parentError = validateDiscussionParentPostId(existingPosts, parentPostId);
      if (parentError) {
        res.status(400).json({ error: parentError });
        return;
      }
    }
    const created = await createAssignmentDiscussionPostAsync(
      req.params.classId,
      req.params.assignmentId,
      {
        authorAccountId: account.id,
        authorRole: 'student',
        body: body.body,
        parentPostId: parentPostId || undefined,
      },
    );
    res.status(201).json(created);
  },
);

/** DELETE /v1/student/classes/:classId/assignments/:assignmentId/discussion/:postId */
studentRouter.delete(
  '/student/classes/:classId/assignments/:assignmentId/discussion/:postId',
  async (req, res) => {
    const account = req.account!;
    const enrollment = await getStudentEnrollmentAsync(req.params.classId, account.email);
    if (!enrollment) {
      res.status(404).json({ error: 'class not found' });
      return;
    }
    const posts = await listAssignmentDiscussionAsync(req.params.classId, req.params.assignmentId);
    const post = posts.find((p) => p.id === req.params.postId);
    if (!post) {
      res.status(404).json({ error: 'post not found' });
      return;
    }
    if (post.authorAccountId !== account.id) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    await removeAssignmentDiscussionPostAsync(
      req.params.classId,
      req.params.assignmentId,
      req.params.postId,
    );
    res.status(204).send();
  },
);
