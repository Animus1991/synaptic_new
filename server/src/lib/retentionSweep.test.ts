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
import {
  AUDIT_LOG_RETENTION_MONTHS,
  TRANSCRIBE_JOB_RETENTION_DAYS,
} from './retentionPolicy';

// Records are stamped with the real wall clock, so express each sweep date
// RELATIVE to "now" (past the retention window) instead of a hard-coded future
// date. Hard-coded dates silently stop purging once real time crosses them.
const monthsFromNow = (months: number): Date => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
};
const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

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

    // Sweep one month past the retention window so the just-written row is stale.
    const result = await runRetentionSweep(monthsFromNow(AUDIT_LOG_RETENTION_MONTHS + 1));
    expect(result.auditLogsPurged).toBeGreaterThanOrEqual(1);
  });

  it('purges in-memory transcribe jobs older than 90 days', async () => {
    enqueueTranscribeJob({
      accountId: 'acc_1',
      audioBase64: 'AA==',
      filename: 'clip.wav',
    });

    const result = await runRetentionSweep(daysFromNow(TRANSCRIBE_JOB_RETENTION_DAYS + 10));
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
