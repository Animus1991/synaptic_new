import type { NextFunction, Request, Response } from 'express';
import { getOrgMembershipAsync } from '../store/orgStore';
import type { OrgRole } from '../store/orgStore';

/**
 * Sprint L3 — org-scoped RBAC middleware.
 * Requires authenticated account with one of the given roles in req.params.orgId.
 */
export function requireOrgRole(...roles: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const account = req.account;
    if (!account) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const orgId = req.params.orgId;
    if (!orgId?.trim()) {
      res.status(400).json({ error: 'orgId required' });
      return;
    }
    const membership = await getOrgMembershipAsync(orgId, account.id);
    if (!membership || !roles.includes(membership.role)) {
      res.status(403).json({ error: 'Insufficient org permissions' });
      return;
    }
    next();
  };
}

/** Any org member (admin, teacher, or student). */
export async function requireOrgMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const account = req.account;
  if (!account) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const orgId = req.params.orgId;
  if (!orgId?.trim()) {
    res.status(400).json({ error: 'orgId required' });
    return;
  }
  const membership = await getOrgMembershipAsync(orgId, account.id);
  if (!membership) {
    res.status(404).json({ error: 'organization not found' });
    return;
  }
  next();
}
