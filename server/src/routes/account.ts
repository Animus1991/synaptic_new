import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { exportAccountData, deleteAccountData } from '../lib/accountLifecycle';

export const accountRouter = Router();

function rejectAnonymous(accountId: string | undefined, res: import('express').Response): accountId is string {
  if (!accountId || accountId === 'anonymous') {
    res.status(403).json({ error: 'Account export/delete requires a signed-in account' });
    return false;
  }
  return true;
}

accountRouter.get('/account/export', authenticate, async (req, res) => {
  const accountId = req.account?.id;
  if (!rejectAnonymous(accountId, res)) return;

  const payload = await exportAccountData(accountId);
  if (!payload) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="synapse-export-${accountId.slice(0, 8)}.json"`,
  );
  res.send(JSON.stringify(payload, null, 2));
});

accountRouter.delete('/account', authenticate, async (req, res) => {
  const accountId = req.account?.id;
  if (!rejectAnonymous(accountId, res)) return;

  const confirmEmail = typeof req.body?.confirmEmail === 'string'
    ? req.body.confirmEmail.trim().toLowerCase()
    : '';
  if (!confirmEmail || confirmEmail !== req.account!.email.toLowerCase()) {
    res.status(400).json({ error: 'confirmEmail must match your account email' });
    return;
  }

  const deleted = await deleteAccountData(accountId);
  if (!deleted) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json({ ok: true, deleted: true });
});
