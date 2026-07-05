import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listStudentClassesAsync,
} from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
import { listStudentAnnouncementsAsync } from '../store/announcementStore';
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
