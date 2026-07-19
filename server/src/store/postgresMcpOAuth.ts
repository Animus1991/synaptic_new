import pg from 'pg';
import type { RegisteredClient } from '../mcp/oauth/store';

const { Pool } = pg;

type AuthCodeRow = {
  clientId: string;
  accountId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scope: string;
  expiresAt: number;
};

export interface McpOAuthRepository {
  saveClient(client: RegisteredClient): Promise<void>;
  getClient(clientId: string): Promise<RegisteredClient | undefined>;
  issueAuthCode(codeHash: string, entry: AuthCodeRow): Promise<void>;
  consumeAuthCode(codeHash: string): Promise<AuthCodeRow | undefined>;
}

type ClientDbRow = {
  client_id: string;
  redirect_uris: string[];
  client_name: string | null;
  scope: string | null;
  token_endpoint_auth_method: string;
  created_at: Date;
};

type CodeDbRow = {
  client_id: string;
  account_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  expires_at: Date;
};

export function createPostgresMcpOAuthRepo(databaseUrl: string): McpOAuthRepository {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async saveClient(client) {
      await pool.query(
        `INSERT INTO mcp_oauth_clients
           (client_id, redirect_uris, client_name, scope, token_endpoint_auth_method, created_at)
         VALUES ($1, $2::jsonb, $3, $4, $5, $6::timestamptz)
         ON CONFLICT (client_id) DO UPDATE SET
           redirect_uris = EXCLUDED.redirect_uris,
           client_name = EXCLUDED.client_name,
           scope = EXCLUDED.scope`,
        [
          client.clientId,
          JSON.stringify(client.redirectUris),
          client.clientName ?? null,
          client.scope ?? null,
          client.tokenEndpointAuthMethod,
          new Date(client.createdAt).toISOString(),
        ],
      );
    },

    async getClient(clientId) {
      const res = await pool.query<ClientDbRow>(
        'SELECT * FROM mcp_oauth_clients WHERE client_id = $1',
        [clientId],
      );
      if (!res.rowCount) return undefined;
      const row = res.rows[0]!;
      const uris = Array.isArray(row.redirect_uris)
        ? row.redirect_uris
        : (row.redirect_uris as unknown as string[]);
      return {
        clientId: row.client_id,
        redirectUris: uris,
        clientName: row.client_name ?? undefined,
        scope: row.scope ?? undefined,
        tokenEndpointAuthMethod: 'none',
        createdAt: row.created_at.getTime(),
      };
    },

    async issueAuthCode(codeHash, entry) {
      await pool.query(
        `INSERT INTO mcp_oauth_auth_codes
           (code_hash, client_id, account_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)`,
        [
          codeHash,
          entry.clientId,
          entry.accountId,
          entry.redirectUri,
          entry.codeChallenge,
          entry.codeChallengeMethod,
          entry.scope,
          new Date(entry.expiresAt).toISOString(),
        ],
      );
    },

    async consumeAuthCode(codeHash) {
      const res = await pool.query<CodeDbRow>(
        `DELETE FROM mcp_oauth_auth_codes
         WHERE code_hash = $1 AND expires_at > NOW()
         RETURNING *`,
        [codeHash],
      );
      if (!res.rowCount) return undefined;
      const row = res.rows[0]!;
      return {
        clientId: row.client_id,
        accountId: row.account_id,
        redirectUri: row.redirect_uri,
        codeChallenge: row.code_challenge,
        codeChallengeMethod: 'S256',
        scope: row.scope,
        expiresAt: row.expires_at.getTime(),
      };
    },
  };
}

export function createMcpOAuthRepo(databaseUrl: string | undefined): McpOAuthRepository | null {
  if (!databaseUrl?.trim()) return null;
  return createPostgresMcpOAuthRepo(databaseUrl.trim());
}
