import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireOrgMember, requireOrgRole } from '../middleware/rbac';
import { findByEmailAsync } from '../store/accounts';
import {
  createTeacherClassAsync,
  listOrgClassesAsync,
  rosterCountAsync,
} from '../store/classStore';
import {
  addOrgMemberAsync,
  createOrganizationAsync,
  getOrganizationAsync,
  getOrgMembershipAsync,
  listOrgMembersAsync,
  listOrgsForAccountAsync,
  type OrgRole,
} from '../store/orgStore';

export const orgRouter = Router();

orgRouter.use(authenticate);

/** POST /v1/orgs — create institution; caller becomes org_admin. */
orgRouter.post('/orgs', async (req, res) => {
  const account = req.account!;
  const body = req.body as { name?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const org = await createOrganizationAsync(body.name, account.id);
  res.status(201).json(org);
});

/** GET /v1/orgs — list orgs the caller belongs to. */
orgRouter.get('/orgs', async (req, res) => {
  const account = req.account!;
  const orgs = await listOrgsForAccountAsync(account.id);
  res.json({ orgs });
});

/** GET /v1/orgs/:orgId — org detail (members only). */
orgRouter.get('/orgs/:orgId', requireOrgMember, async (req, res) => {
  const org = await getOrganizationAsync(req.params.orgId);
  if (!org) {
    res.status(404).json({ error: 'organization not found' });
    return;
  }
  const membership = await getOrgMembershipAsync(org.id, req.account!.id);
  res.json({ org, membership });
});

/** GET /v1/orgs/:orgId/members — roster of org accounts (org_admin). */
orgRouter.get('/orgs/:orgId/members', requireOrgRole('org_admin'), async (req, res) => {
  const members = await listOrgMembersAsync(req.params.orgId);
  res.json({ orgId: req.params.orgId, members });
});

/** POST /v1/orgs/:orgId/members — add or update member (org_admin). */
orgRouter.post('/orgs/:orgId/members', requireOrgRole('org_admin'), async (req, res) => {
  const body = req.body as { accountId?: string; email?: string; role?: OrgRole };
  const role = body.role ?? 'teacher';
  if (!['org_admin', 'teacher', 'student'].includes(role)) {
    res.status(400).json({ error: 'invalid role' });
    return;
  }
  let accountId = body.accountId?.trim();
  if (!accountId && body.email?.trim()) {
    const found = await findByEmailAsync(body.email.trim());
    if (!found) {
      res.status(404).json({ error: 'account not found for email' });
      return;
    }
    accountId = found.id;
  }
  if (!accountId) {
    res.status(400).json({ error: 'accountId or email required' });
    return;
  }
  const member = await addOrgMemberAsync(req.params.orgId, accountId, role);
  res.status(201).json(member);
});

/** GET /v1/orgs/:orgId/classes — all classes in org (org_admin). */
orgRouter.get('/orgs/:orgId/classes', requireOrgRole('org_admin'), async (req, res) => {
  const classes = await listOrgClassesAsync(req.params.orgId);
  const rows = await Promise.all(
    classes.map(async (c) => ({
      ...c,
      studentCount: await rosterCountAsync(c.id),
    })),
  );
  res.json({ orgId: req.params.orgId, classes: rows });
});

/** POST /v1/orgs/:orgId/classes — create class under org (org_admin or teacher member). */
orgRouter.post('/orgs/:orgId/classes', requireOrgMember, async (req, res) => {
  const account = req.account!;
  const membership = await getOrgMembershipAsync(req.params.orgId, account.id);
  if (!membership || !['org_admin', 'teacher'].includes(membership.role)) {
    res.status(403).json({ error: 'Insufficient org permissions' });
    return;
  }
  const body = req.body as { name?: string; courseId?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const created = await createTeacherClassAsync(account.id, {
    name: body.name,
    courseId: body.courseId,
    orgId: req.params.orgId,
  });
  res.status(201).json(created);
});
