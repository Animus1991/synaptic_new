/** OPS-01 — audit log retention (docs/compliance/RETENTION.md). */
export const AUDIT_LOG_RETENTION_MONTHS = 24;

/** OPS-02 — transcribe job retention. */
export const TRANSCRIBE_JOB_RETENTION_DAYS = 90;

export function auditLogCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - AUDIT_LOG_RETENTION_MONTHS);
  return cutoff;
}

export function transcribeJobCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - TRANSCRIBE_JOB_RETENTION_DAYS);
  return cutoff;
}
