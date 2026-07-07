import { config } from '../config';
import { auditLogCutoffDate, transcribeJobCutoffDate } from './retentionPolicy';
import {
  purgeMemoryAuditLogsBefore,
  anonymizeMemoryAuditLogsForAccount,
} from '../store/auditLogStore';
import {
  purgeMemoryTranscribeJobsBefore,
  purgeMemoryTranscribeJobsForAccount,
} from '../jobs/transcribeQueue';
import { createRetentionRepository } from '../store/retentionPostgres';

export type RetentionSweepResult = {
  auditLogsPurged: number;
  transcribeJobsPurged: number;
};

export async function runRetentionSweep(now: Date = new Date()): Promise<RetentionSweepResult> {
  const auditCutoff = auditLogCutoffDate(now);
  const transcribeCutoff = transcribeJobCutoffDate(now);
  const pgRepo = createRetentionRepository(config.databaseUrl);

  let auditLogsPurged = purgeMemoryAuditLogsBefore(auditCutoff);
  let transcribeJobsPurged = purgeMemoryTranscribeJobsBefore(transcribeCutoff);

  if (pgRepo) {
    auditLogsPurged += await pgRepo.purgeAuditLogsBefore(auditCutoff);
    transcribeJobsPurged += await pgRepo.purgeTranscribeJobsBefore(transcribeCutoff);
  }

  return { auditLogsPurged, transcribeJobsPurged };
}

/** OPS-03 — anonymize audit trail and purge account-scoped job rows (in-memory stores). */
export function purgeAccountScopedRetentionData(accountId: string): void {
  anonymizeMemoryAuditLogsForAccount(accountId);
  purgeMemoryTranscribeJobsForAccount(accountId);
}
