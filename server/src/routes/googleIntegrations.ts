import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { googleOAuthConfigured, hasGoogleScope } from '../lib/googleOAuth';
import { getValidAccessToken, googleStatusForAccount } from '../store/googleTokenStore';

export const googleIntegrationsRouter = Router();

async function requireGoogle(req: Request, res: Response): Promise<string | null> {
  if (!googleOAuthConfigured()) {
    res.status(503).json({ error: 'Google OAuth not configured' });
    return null;
  }
  const accountId = req.account?.id;
  if (!accountId || accountId === 'anonymous') {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  const status = await googleStatusForAccount(accountId);
  if (!status.connected) {
    res.status(403).json({ error: 'Google account not connected', code: 'google_not_connected' });
    return null;
  }
  return accountId;
}

googleIntegrationsRouter.get('/google/tasks/lists', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;
  const status = await googleStatusForAccount(accountId);
  if (!hasGoogleScope(status.scopes, 'https://www.googleapis.com/auth/tasks')) {
    res.status(403).json({ error: 'Tasks scope not granted — reconnect Google with Tasks permission' });
    return;
  }
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }
  const apiRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }
  const data = (await apiRes.json()) as { items?: unknown[] };
  res.json({ lists: data.items ?? [] });
});

googleIntegrationsRouter.get('/google/tasks', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;
  const listId = typeof req.query.listId === 'string' ? req.query.listId : '@default';
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }
  const apiRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks?showCompleted=false&maxResults=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }
  const data = (await apiRes.json()) as { items?: unknown[] };
  res.json({ tasks: data.items ?? [], listId });
});

googleIntegrationsRouter.post('/google/tasks', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : undefined;
  const listId = typeof req.body?.listId === 'string' ? req.body.listId : '@default';
  if (!title) {
    res.status(400).json({ error: 'title required' });
    return;
  }
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }
  const apiRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, notes }),
    },
  );
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }
  res.status(201).json(await apiRes.json());
});

googleIntegrationsRouter.post('/google/meet/spaces', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;
  const status = await googleStatusForAccount(accountId);
  if (!hasGoogleScope(status.scopes, 'https://www.googleapis.com/auth/meetings.space.created')) {
    res.status(403).json({ error: 'Meet scope not granted — reconnect Google with Meet permission' });
    return;
  }
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }
  const apiRes = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config: { accessType: 'OPEN' } }),
  });
  if (!apiRes.ok) {
    const errText = await apiRes.text();
    res.status(apiRes.status).json({
      error: errText.slice(0, 300),
      hint: 'Ensure Google Meet API is enabled in Cloud Console',
    });
    return;
  }
  const space = (await apiRes.json()) as { name?: string; meetingUri?: string; meetingCode?: string };
  res.status(201).json({
    meetingUri: space.meetingUri,
    meetingCode: space.meetingCode,
    name: space.name,
  });
});
