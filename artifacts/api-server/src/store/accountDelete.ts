import { deleteAccountAsync } from '../store/accounts';

/** Delete account row (Postgres transaction or in-memory map). */
export async function deleteAccountFromStore(accountId: string): Promise<boolean> {
  return deleteAccountAsync(accountId);
}
