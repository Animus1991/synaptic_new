import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { googleOAuthConfigured, hasGoogleScope } from '../lib/googleOAuth';
import { getValidAccessToken, googleStatusForAccount } from '../store/googleTokenStore';

export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const googleCalendarRouter = Router();

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
  if (!hasGoogleScope(status.scopes, GOOGLE_CALENDAR_EVENTS_SCOPE)) {
    res.status(403).json({
      error: 'Calendar scope not granted — reconnect Google with Calendar permission',
      code: 'google_calendar_scope_missing',
    });
    return null;
  }
  return accountId;
}

type CalendarEventBody = {
  title?: string;
  description?: string;
  startIso?: string;
  endIso?: string;
  eventId?: string;
  sourceId?: string;
  timeZone?: string;
};

googleCalendarRouter.post('/google/calendar/events', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;

  const body = req.body as CalendarEventBody;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const startIso = typeof body.startIso === 'string' ? body.startIso : '';
  const endIso = typeof body.endIso === 'string' ? body.endIso : '';
  if (!title || !startIso || !endIso) {
    res.status(400).json({ error: 'title, startIso, and endIso are required' });
    return;
  }

  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }

  const timeZone = typeof body.timeZone === 'string' && body.timeZone.trim()
    ? body.timeZone.trim()
    : 'UTC';

  const eventPayload = {
    summary: title,
    description: typeof body.description === 'string' ? body.description : undefined,
    start: { dateTime: startIso, timeZone },
    end: { dateTime: endIso, timeZone },
    extendedProperties: body.sourceId
      ? { private: { synapseSourceId: body.sourceId } }
      : undefined,
  };

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const apiRes = await fetch(url, {
    method: eventId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }

  const data = (await apiRes.json()) as { id?: string; htmlLink?: string };
  res.status(eventId ? 200 : 201).json({
    eventId: data.id,
    htmlLink: data.htmlLink,
  });
});

googleCalendarRouter.delete('/google/calendar/events/:eventId', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;

  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: 'eventId required' });
    return;
  }

  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }

  const apiRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!apiRes.ok && apiRes.status !== 404) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }

  res.json({ ok: true });
});

googleCalendarRouter.get('/google/calendar/events', authenticate, async (req, res) => {
  const accountId = await requireGoogle(req, res);
  if (!accountId) return;

  const timeMin = typeof req.query.timeMin === 'string'
    ? req.query.timeMin
    : new Date().toISOString();
  const timeMax = typeof req.query.timeMax === 'string'
    ? req.query.timeMax
    : new Date(Date.now() + 30 * 86_400_000).toISOString();

  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    res.status(401).json({ error: 'Google token expired — reconnect' });
    return;
  }

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const apiRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: await apiRes.text() });
    return;
  }

  const data = (await apiRes.json()) as { items?: unknown[] };
  res.json({ events: data.items ?? [] });
});
