import { config } from '../config';
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

  if (!config.databaseUrl?.trim()) {
    await deleteLibraryAsync(accountId);
    await deleteSessionAsync(accountId);
  }

  return deleteAccountFromStore(accountId);
}
