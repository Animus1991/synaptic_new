import {
  findByIdAsync,
  getUsage,
  type Account,
} from '../store/accounts';
import { getLibraryAsync, deleteLibraryAsync } from '../store/libraryStore';
import { getSessionAsync, deleteSessionAsync } from '../store/sessionStore';
import { deleteGoogleTokens, googleStatusForAccount } from '../store/googleTokenStore';
import { revokeTokensForAccount } from '../store/tokenStore';
import { getVectorChunkStore } from '../store/vectorChunkStore';
import { deleteThumbnailsForAccount } from '../store/thumbnailStore';
import { deleteAccountFromStore } from '../store/accountDelete';
import { purgeAccountScopedRetentionData } from './retentionSweep';

export type AccountExportPayload = {
  exportedAt: string;
  version: '1';
  account: {
    id: string;
    email: string;
    plan: string;
    createdAt: string;
    usage: ReturnType<typeof getUsage>;
  };
  library: Awaited<ReturnType<typeof getLibraryAsync>>;
  session: Awaited<ReturnType<typeof getSessionAsync>>;
  google: Awaited<ReturnType<typeof googleStatusForAccount>>;
  vectorChunkCount: number;
};

function publicAccount(account: Account): AccountExportPayload['account'] {
  return {
    id: account.id,
    email: account.email,
    plan: account.plan,
    createdAt: account.createdAt,
    usage: getUsage(account),
  };
}

/** GDPR data export — omits password hashes and raw OAuth tokens. */
export async function exportAccountData(accountId: string): Promise<AccountExportPayload | null> {
  if (accountId === 'anonymous') return null;
  const account = await findByIdAsync(accountId);
  if (!account) return null;

  const [library, session, vectorChunkCount, google] = await Promise.all([
    getLibraryAsync(accountId),
    getSessionAsync(accountId),
    getVectorChunkStore().count(accountId),
    googleStatusForAccount(accountId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: '1',
    account: publicAccount(account),
    library,
    session,
    google,
    vectorChunkCount,
  };
}

/** GDPR account deletion — removes server-side personal data for the account. */
export async function deleteAccountData(accountId: string): Promise<boolean> {
  if (accountId === 'anonymous') return false;
  const account = await findByIdAsync(accountId);
  if (!account) return false;

  await getVectorChunkStore().syncAccountChunks(accountId, [], { activeFileIds: [] });
  await deleteThumbnailsForAccount(accountId);
  purgeAccountScopedRetentionData(accountId);
  await deleteGoogleTokens(accountId);
  await revokeTokensForAccount(accountId);

  /* D5 GDPR hardening — erase the library + session payloads explicitly as part
     of the account-scoped pre-clean, mirroring the thumbnail/vector-chunk steps
     above. This is a deliberate defense-in-depth pass, NOT the sole erasure path:
     in Postgres mode the authoritative deletion happens atomically inside
     deleteAccountFromStore -> pgRepo.deleteAccount, whose single transaction also
     DELETEs account_libraries and account_sessions (see store/postgres.ts). Note
     that account_libraries / account_sessions carry account_id as a plain PK with
     NO FK ON DELETE CASCADE to accounts (migration 0), so in the in-memory store
     — where deleteAccountFromStore only drops the accounts map entry — these two
     explicit deletes are what actually guarantee right-to-erasure completeness.
     deleteLibraryAsync/deleteSessionAsync are idempotent in both modes, so the
     redundant Postgres pass is harmless. */
  await deleteLibraryAsync(accountId);
  await deleteSessionAsync(accountId);

  return deleteAccountFromStore(accountId);
}
