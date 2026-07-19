/**
 * Google OAuth token store — Postgres when DATABASE_URL is set (multi-instance),
 * in-memory fallback for local/dev. Pending OAuth state + auth completion codes
 * stay in-memory (short TTL); tokens persist durably.
 */
import { randomBytes } from 'node:crypto';
import { config } from '../config';
import {
  refreshGoogleAccessToken,
  type GoogleTokenResponse,
} from '../lib/googleOAuth';
import { createGoogleTokenRepo } from './postgresGoogleTokens';

export type GoogleTokenRecord = {
  accountId: string;
  googleSub: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  updatedAt: string;
};

const byAccount = new Map<string, GoogleTokenRecord>();
const byGoogleSub = new Map<string, string>();
const pgRepo = createGoogleTokenRepo(config.databaseUrl);

/** OAuth state → pending flow metadata (60s TTL). */
type PendingOAuth = {
  mode: 'signin' | 'connect';
  accountId?: string;
  returnTo?: string;
  expiresAt: number;
};

const pendingStates = new Map<string, PendingOAuth>();

/** One-time auth completion codes (90s TTL). */
type AuthCompletion = {
  token: string;
  refreshToken: string;
  email: string;
  plan: string;
  expiresAt: number;
};

const authCompletions = new Map<string, AuthCompletion>();

export function createOAuthState(
  mode: 'signin' | 'connect',
  accountId?: string,
  returnTo?: string,
): string {
  const state = randomBytes(24).toString('hex');
  pendingStates.set(state, {
    mode,
    accountId,
    returnTo,
    expiresAt: Date.now() + 60_000,
  });
  return state;
}

export function consumeOAuthState(state: string): PendingOAuth | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

export function issueAuthCompletion(payload: Omit<AuthCompletion, 'expiresAt'>): string {
  const code = randomBytes(24).toString('hex');
  authCompletions.set(code, { ...payload, expiresAt: Date.now() + 90_000 });
  return code;
}

export function consumeAuthCompletion(code: string): AuthCompletion | null {
  const entry = authCompletions.get(code);
  if (!entry) return null;
  authCompletions.delete(code);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

export async function saveGoogleTokens(record: GoogleTokenRecord): Promise<void> {
  if (pgRepo) {
    await pgRepo.save(record);
    return;
  }
  byAccount.set(record.accountId, record);
  byGoogleSub.set(record.googleSub, record.accountId);
}

export async function getGoogleTokens(accountId: string): Promise<GoogleTokenRecord | undefined> {
  if (pgRepo) return pgRepo.getByAccountId(accountId);
  return byAccount.get(accountId);
}

export async function deleteGoogleTokens(accountId: string): Promise<boolean> {
  if (pgRepo) return pgRepo.deleteByAccountId(accountId);
  const existing = byAccount.get(accountId);
  if (existing) byGoogleSub.delete(existing.googleSub);
  return byAccount.delete(accountId);
}

export async function googleStatusForAccount(accountId: string): Promise<{
  connected: boolean;
  email?: string;
  scopes: string[];
  hasTasks: boolean;
  hasMeet: boolean;
  hasCalendar: boolean;
}> {
  const rec = await getGoogleTokens(accountId);
  if (!rec) {
    return { connected: false, scopes: [], hasTasks: false, hasMeet: false, hasCalendar: false };
  }
  return {
    connected: true,
    email: rec.email,
    scopes: rec.scopes,
    hasTasks: rec.scopes.includes('https://www.googleapis.com/auth/tasks'),
    hasMeet: rec.scopes.includes('https://www.googleapis.com/auth/meetings.space.created'),
    hasCalendar: rec.scopes.includes('https://www.googleapis.com/auth/calendar.events'),
  };
}

export function buildTokenRecord(
  accountId: string,
  user: { sub: string; email: string },
  tokenRes: GoogleTokenResponse,
  existingRefresh?: string,
): GoogleTokenRecord {
  const scopes = (tokenRes.scope ?? '').split(' ').filter(Boolean);
  const expiresAt = Date.now() + (tokenRes.expires_in ?? 3600) * 1000;
  return {
    accountId,
    googleSub: user.sub,
    email: user.email,
    accessToken: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token ?? existingRefresh,
    expiresAt,
    scopes,
    updatedAt: new Date().toISOString(),
  };
}

export async function getValidAccessToken(accountId: string): Promise<string | null> {
  const rec = await getGoogleTokens(accountId);
  if (!rec) return null;
  if (rec.expiresAt > Date.now() + 60_000) return rec.accessToken;
  if (!rec.refreshToken) return rec.accessToken;
  try {
    const refreshed = await refreshGoogleAccessToken(rec.refreshToken);
    rec.accessToken = refreshed.access_token;
    rec.expiresAt = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
    if (refreshed.refresh_token) rec.refreshToken = refreshed.refresh_token;
    if (refreshed.scope) rec.scopes = refreshed.scope.split(' ').filter(Boolean);
    rec.updatedAt = new Date().toISOString();
    await saveGoogleTokens(rec);
    return rec.accessToken;
  } catch {
    return null;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingStates) {
    if (v.expiresAt < now) pendingStates.delete(k);
  }
  for (const [k, v] of authCompletions) {
    if (v.expiresAt < now) authCompletions.delete(k);
  }
}, 30_000).unref();
