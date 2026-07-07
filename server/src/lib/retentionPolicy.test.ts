import { describe, expect, it } from 'vitest';
import {
  AUDIT_LOG_RETENTION_MONTHS,
  TRANSCRIBE_JOB_RETENTION_DAYS,
  auditLogCutoffDate,
  transcribeJobCutoffDate,
} from './retentionPolicy';

describe('retentionPolicy', () => {
  it('audit log cutoff is 24 months before now', () => {
    const now = new Date('2026-07-06T12:00:00.000Z');
    const cutoff = auditLogCutoffDate(now);
    expect(AUDIT_LOG_RETENTION_MONTHS).toBe(24);
    expect(cutoff.getFullYear()).toBe(2024);
    expect(cutoff.getMonth()).toBe(6);
    expect(cutoff.getDate()).toBe(6);
  });

  it('transcribe job cutoff is 90 days before now', () => {
    const now = new Date('2026-07-06T12:00:00.000Z');
    const cutoff = transcribeJobCutoffDate(now);
    expect(TRANSCRIBE_JOB_RETENTION_DAYS).toBe(90);
    expect(cutoff.toISOString().slice(0, 10)).toBe('2026-04-07');
  });
});
