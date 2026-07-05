import pg from 'pg';
import type { OrgMembership, OrgRole, Organization } from './orgStore';

const { Pool } = pg;

export interface OrgRepository {
  createOrganization(name: string, creatorAccountId: string): Promise<Organization>;
  listOrgsForAccount(accountId: string): Promise<Organization[]>;
  getOrganization(orgId: string): Promise<Organization | null>;
  getMembership(orgId: string, accountId: string): Promise<OrgMembership | null>;
  addMembership(orgId: string, accountId: string, role: OrgRole): Promise<OrgMembership>;
  listMembers(orgId: string): Promise<OrgMembership[]>;
}

function rowToOrg(row: { id: string; name: string; created_at: Date }): Organization {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToMembership(row: {
  id: string;
  org_id: string;
  account_id: string;
  role: string;
  created_at: Date;
}): OrgMembership {
  return {
    id: row.id,
    orgId: row.org_id,
    accountId: row.account_id,
    role: row.role as OrgRole,
    createdAt: row.created_at.toISOString(),
  };
}

export function createOrgRepo(databaseUrl: string): OrgRepository {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async createOrganization(name: string, creatorAccountId: string): Promise<Organization> {
      const id = `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const membershipId = `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO organizations (id, name, created_at) VALUES ($1, $2, $3::timestamptz)`,
          [id, name.trim() || 'Untitled institution', createdAt],
        );
        await client.query(
          `INSERT INTO org_memberships (id, org_id, account_id, role, created_at)
           VALUES ($1, $2, $3, 'org_admin', $4::timestamptz)`,
          [membershipId, id, creatorAccountId, createdAt],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return { id, name: name.trim() || 'Untitled institution', createdAt };
    },

    async listOrgsForAccount(accountId: string): Promise<Organization[]> {
      const res = await pool.query<{ id: string; name: string; created_at: Date }>(
        `SELECT o.id, o.name, o.created_at
         FROM organizations o
         INNER JOIN org_memberships m ON m.org_id = o.id
         WHERE m.account_id = $1
         ORDER BY o.created_at DESC`,
        [accountId],
      );
      return res.rows.map(rowToOrg);
    },

    async getOrganization(orgId: string): Promise<Organization | null> {
      const res = await pool.query<{ id: string; name: string; created_at: Date }>(
        `SELECT id, name, created_at FROM organizations WHERE id = $1`,
        [orgId],
      );
      if (res.rowCount === 0) return null;
      return rowToOrg(res.rows[0]!);
    },

    async getMembership(orgId: string, accountId: string): Promise<OrgMembership | null> {
      const res = await pool.query<{
        id: string;
        org_id: string;
        account_id: string;
        role: string;
        created_at: Date;
      }>(
        `SELECT id, org_id, account_id, role, created_at
         FROM org_memberships WHERE org_id = $1 AND account_id = $2`,
        [orgId, accountId],
      );
      if (res.rowCount === 0) return null;
      return rowToMembership(res.rows[0]!);
    },

    async addMembership(orgId: string, accountId: string, role: OrgRole): Promise<OrgMembership> {
      const id = `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO org_memberships (id, org_id, account_id, role, created_at)
         VALUES ($1, $2, $3, $4, $5::timestamptz)
         ON CONFLICT (org_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
        [id, orgId, accountId, role, createdAt],
      );
      const row = await this.getMembership(orgId, accountId);
      if (!row) throw new Error('failed to add membership');
      return row;
    },

    async listMembers(orgId: string): Promise<OrgMembership[]> {
      const res = await pool.query<{
        id: string;
        org_id: string;
        account_id: string;
        role: string;
        created_at: Date;
      }>(
        `SELECT id, org_id, account_id, role, created_at
         FROM org_memberships WHERE org_id = $1 ORDER BY created_at ASC`,
        [orgId],
      );
      return res.rows.map(rowToMembership);
    },
  };
}

export function createOrgRepository(databaseUrl: string | undefined): OrgRepository | null {
  if (!databaseUrl?.trim()) return null;
  return createOrgRepo(databaseUrl.trim());
}
