import { describe, it, expect } from 'vitest';
import { auditLogsToCsv, auditLogsToJson } from './auditLogExport';
import type { AuditLogEntry } from '../store/auditLogStore';

const sample: AuditLogEntry[] = [
  {
    id: 'aud_1',
    orgId: 'org_abc',
    accountId: 'acc_1',
    action: 'POST /v1/orgs/org_abc/members',
    resource: '/v1/orgs/org_abc/members',
    metadata: { status: 201, note: 'comma, inside' },
    ip: '127.0.0.1',
    createdAt: '2026-07-06T00:00:00.000Z',
  },
];

describe('auditLogExport', () => {
  it('serializes CSV with escaped metadata', () => {
    const csv = auditLogsToCsv(sample);
    expect(csv).toContain('id,createdAt,orgId,accountId,action,resource,ip,metadata');
    expect(csv).toContain('aud_1');
    expect(csv).toContain('"comma, inside"');
  });

  it('serializes JSON envelope', () => {
    const json = auditLogsToJson('org_abc', sample);
    const parsed = JSON.parse(json) as { orgId: string; count: number; logs: AuditLogEntry[] };
    expect(parsed.orgId).toBe('org_abc');
    expect(parsed.count).toBe(1);
    expect(parsed.logs[0]?.action).toContain('members');
  });
});
