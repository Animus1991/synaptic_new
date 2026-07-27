import { describe, expect, it } from 'vitest';
import {
  createAccountAsync,
  needsPasswordRehash,
  updatePasswordAsync,
  verifyPassword,
  type Account,
} from './accounts';
import { scryptSync, randomBytes } from 'node:crypto';

describe('password hashing v2', () => {
  it('creates scrypt-v2 hashes for new accounts', async () => {
    const account = await createAccountAsync(`v2-${Date.now()}@example.com`, 'password123');
    expect(account.passwordHash.startsWith('$scrypt-v2$')).toBe(true);
    expect(verifyPassword(account, 'password123')).toBe(true);
    expect(verifyPassword(account, 'wrong-password')).toBe(false);
    expect(needsPasswordRehash(account)).toBe(false);
  });

  it('dual-verifies legacy hex hashes and marks rehash', async () => {
    const salt = randomBytes(16).toString('hex');
    const legacyHash = scryptSync('password123', salt, 64).toString('hex');
    const legacy: Account = {
      id: 'legacy-1',
      email: 'legacy@example.com',
      plan: 'free',
      passwordHash: legacyHash,
      salt,
      createdAt: new Date().toISOString(),
      usage: { month: '2026-07', requests: 0, promptTokens: 0, completionTokens: 0 },
    };
    expect(verifyPassword(legacy, 'password123')).toBe(true);
    expect(needsPasswordRehash(legacy)).toBe(true);
  });

  it('updatePasswordAsync writes v2 hashes', async () => {
    const account = await createAccountAsync(`upd-${Date.now()}@example.com`, 'password123');
    await updatePasswordAsync(account.id, 'newpassword99');
    const { findByIdAsync } = await import('./accounts');
    const fresh = await findByIdAsync(account.id);
    expect(fresh).toBeTruthy();
    expect(fresh!.passwordHash.startsWith('$scrypt-v2$')).toBe(true);
    expect(verifyPassword(fresh!, 'newpassword99')).toBe(true);
  });
});
