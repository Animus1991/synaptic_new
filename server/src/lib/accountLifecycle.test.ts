import { describe, expect, it } from 'vitest';
import { createAccountAsync, findByIdAsync } from '../store/accounts';
import { getLibraryAsync, saveLibraryAsync } from '../store/libraryStore';
import { getSessionAsync, saveSessionAsync } from '../store/sessionStore';
import { exportAccountData, deleteAccountData } from './accountLifecycle';

/**
 * Runs in the default in-memory store mode (no DATABASE_URL). These tests lock in
 * the D5 GDPR contract: export omits credentials, and delete fully erases the
 * account plus its non-cascading library/session payloads (right-to-erasure).
 */
describe('accountLifecycle (GDPR export/delete)', () => {
  let counter = 0;
  const uniqueEmail = () => `erasure-${Date.now()}-${counter++}@example.com`;

  async function seedAccountWithData() {
    const account = await createAccountAsync(uniqueEmail(), 'sufficiently-long-password');
    await saveLibraryAsync(account.id, {
      uploadedFiles: [{ id: 'file_1', name: 'notes.pdf' }],
      glossaryEntries: [{ term: 'entropy' }],
      generatedCourses: [{ id: 'course_1' }],
    });
    await saveSessionAsync(account.id, {
      learnerModel: { mastery: 0.5 },
      dashboardStats: null,
      tasks: [{ id: 'task_1' }],
      xp: 120,
      betaMastery: [],
      firstAttemptKeys: ['q1'],
      openMistakes: [],
      activities: [{ type: 'quiz' }],
      userSettings: { theme: 'minimal' },
    });
    return account;
  }

  it('exports account data with library + session but never credentials', async () => {
    const account = await seedAccountWithData();

    const payload = await exportAccountData(account.id);

    expect(payload).not.toBeNull();
    expect(payload!.account.id).toBe(account.id);
    expect(payload!.account.email).toBe(account.email);
    expect(payload!.library.uploadedFiles).toHaveLength(1);
    expect(payload!.session.xp).toBe(120);
    // Right-to-portability without leaking secrets.
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('salt');
    expect(serialized).not.toContain(account.passwordHash);
  });

  it('fully erases the account plus its non-cascading library + session payloads', async () => {
    const account = await seedAccountWithData();

    const deleted = await deleteAccountData(account.id);
    expect(deleted).toBe(true);

    // Account row gone.
    expect(await findByIdAsync(account.id)).toBeUndefined();
    // Library / session payloads must not survive (no FK CASCADE backs them).
    const library = await getLibraryAsync(account.id);
    expect(library.uploadedFiles).toHaveLength(0);
    expect(library.glossaryEntries).toHaveLength(0);
    expect(library.generatedCourses).toHaveLength(0);
    const session = await getSessionAsync(account.id);
    expect(session.xp).toBe(0);
    expect(session.tasks).toHaveLength(0);
    expect(session.activities).toHaveLength(0);
    // Export after deletion yields nothing.
    expect(await exportAccountData(account.id)).toBeNull();
  });

  it('rejects the anonymous pseudo-account for both export and delete', async () => {
    expect(await exportAccountData('anonymous')).toBeNull();
    expect(await deleteAccountData('anonymous')).toBe(false);
  });

  it('is idempotent — deleting a missing account is a safe no-op', async () => {
    expect(await deleteAccountData('acct_does_not_exist')).toBe(false);
  });
});
