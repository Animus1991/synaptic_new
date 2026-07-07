import { describe, expect, it, beforeEach } from 'vitest';
import {
  appendAuditLogAsync,
  listAuditLogsForOrgAsync,
  resetAuditLogStore,
} from '../store/auditLogStore';
import {
  enqueueTranscribeJob,
  getTranscribeJob,
  resetTranscribeJobs,
} from '../jobs/transcribeQueue';
import { runRetentionSweep, purgeAccountScopedRetentionData } from './retentionSweep';

describe('retentionSweep', () => {
  beforeEach(() => {
    resetAuditLogStore();
    resetTranscribeJobs();
  });

  it('purges in-memory audit logs older than 24 months', async () => {
    await appendAuditLogAsync({
      orgId: 'org_1',
      accountId: 'acc_old',
      action: 'login',
      metadata: {},
    });

    const result = await runRetentionSweep(new Date('2028-08-01T00:00:00.000Z'));
    expect(result.auditLogsPurged).toBeGreaterThanOrEqual(1);
  });

  it('purges in-memory transcribe jobs older than 90 days', async () => {
    enqueueTranscribeJob({
      accountId: 'acc_1',
      audioBase64: 'AA==',
      filename: 'clip.wav',
    });

    const result = await runRetentionSweep(new Date('2026-12-01T00:00:00.000Z'));
    expect(result.transcribeJobsPurged).toBeGreaterThanOrEqual(1);
  });

  it('anonymizes audit logs and removes transcribe jobs for deleted account', async () => {
    await appendAuditLogAsync({
      orgId: 'org_1',
      accountId: 'acc_del',
      action: 'export',
      metadata: {},
    });
    const job = enqueueTranscribeJob({
      accountId: 'acc_del',
      audioBase64: 'AA==',
      filename: 'clip.wav',
    });

    purgeAccountScopedRetentionData('acc_del');

    const logs = await listAuditLogsForOrgAsync('org_1', { limit: 10 });
    expect(logs[0]?.accountId).toBeUndefined();
    expect(getTranscribeJob(job.id, 'acc_del')).toBeNull();
  });
});
