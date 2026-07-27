import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { config } from '../config';
import { createTokenRepo } from './postgres';

export type StoredTokenKind = 'refresh' | 'password_reset' | 'email_verify';

export type TokenMeta = {
  userAgent?: string;
  ip?: string;
};

export type StoredToken = {
  id: string;
  accountId: string;
  expiresAt: number;
  kind: StoredTokenKind;
  userAgent?: string;
  ip?: string;
  createdAt: number;
};

export type SessionRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
  current?: boolean;
};

const tokens = new Map<string, StoredToken>();
const pgRepo = createTokenRepo(config.databaseUrl);

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function issueToken(
  accountId: string,
  kind: StoredTokenKind,
  ttlMs: number,
  meta?: TokenMeta,
): Promise<{ raw: string; id: string }> {
  const raw = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  const key = hashToken(raw);
  const id = randomUUID();
  const createdAt = Date.now();

  if (pgRepo) {
    await pgRepo.issueToken(accountId, key, kind, new Date(expiresAt), {
      id,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });
    return { raw, id };
  }

  tokens.set(key, {
    id,
    accountId,
    expiresAt,
    kind,
    userAgent: meta?.userAgent,
    ip: meta?.ip,
    createdAt,
  });
  return { raw, id };
}

export async function consumeToken(raw: string, kind: StoredTokenKind): Promise<string | null> {
  const key = hashToken(raw);

  if (pgRepo) {
    return pgRepo.consumeToken(key, kind);
  }

  const entry = tokens.get(key);
  if (!entry || entry.kind !== kind) return null;
  if (entry.expiresAt < Date.now()) {
    tokens.delete(key);
    return null;
  }
  tokens.delete(key);
  return entry.accountId;
}

/** Peek refresh session id without consuming (for current-session marking). */
export async function findRefreshSessionId(raw: string): Promise<string | null> {
  const key = hashToken(raw);
  if (pgRepo) {
    return pgRepo.findSessionIdByHash?.(key, 'refresh') ?? null;
  }
  const entry = tokens.get(key);
  if (!entry || entry.kind !== 'refresh') return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry.id;
}

export async function listRefreshSessions(
  accountId: string,
  currentSessionId?: string,
): Promise<SessionRow[]> {
  if (pgRepo) {
    const rows = await pgRepo.listRefreshSessions(accountId);
    return rows.map((r) => ({
      ...r,
      current: currentSessionId ? r.id === currentSessionId : false,
    }));
  }
  const out: SessionRow[] = [];
  for (const v of tokens.values()) {
    if (v.accountId !== accountId || v.kind !== 'refresh') continue;
    if (v.expiresAt < Date.now()) continue;
    out.push({
      id: v.id,
      createdAt: new Date(v.createdAt).toISOString(),
      expiresAt: new Date(v.expiresAt).toISOString(),
      userAgent: v.userAgent,
      ip: v.ip,
      current: currentSessionId ? v.id === currentSessionId : false,
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeSessionById(accountId: string, sessionId: string): Promise<boolean> {
  if (pgRepo) {
    return pgRepo.revokeSessionById(accountId, sessionId);
  }
  for (const [k, v] of tokens) {
    if (v.accountId === accountId && v.id === sessionId) {
      tokens.delete(k);
      return true;
    }
  }
  return false;
}

export async function revokeOtherRefreshSessions(
  accountId: string,
  keepSessionId: string,
): Promise<number> {
  if (pgRepo) {
    return pgRepo.revokeOtherRefreshSessions(accountId, keepSessionId);
  }
  let n = 0;
  for (const [k, v] of tokens) {
    if (v.accountId === accountId && v.kind === 'refresh' && v.id !== keepSessionId) {
      tokens.delete(k);
      n += 1;
    }
  }
  return n;
}

export async function revokeTokensForAccount(accountId: string): Promise<void> {
  if (pgRepo) {
    await pgRepo.revokeTokensForAccount(accountId);
    return;
  }
  for (const [k, v] of tokens) {
    if (v.accountId === accountId) tokens.delete(k);
  }
}

export async function purgeExpiredTokens(): Promise<void> {
  if (pgRepo) {
    await pgRepo.purgeExpiredTokens();
    return;
  }
  const now = Date.now();
  for (const [k, v] of tokens) {
    if (v.expiresAt < now) tokens.delete(k);
  }
}

setInterval(() => {
  purgeExpiredTokens().catch(() => undefined);
}, 60 * 60 * 1000).unref();
