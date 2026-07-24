import type { AuditLogEntry } from '../store/auditLogStore';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditLogsToCsv(logs: readonly AuditLogEntry[]): string {
  const headers = ['id', 'createdAt', 'orgId', 'accountId', 'action', 'resource', 'ip', 'metadata'];
  const rows = logs.map((entry) =>
    [
      entry.id,
      entry.createdAt,
      entry.orgId ?? '',
      entry.accountId ?? '',
      entry.action,
      entry.resource ?? '',
      entry.ip ?? '',
      JSON.stringify(entry.metadata ?? {}),
    ]
      .map((value) => csvEscape(String(value)))
      .join(','),
  );
  return `${[headers.join(','), ...rows].join('\n')}\n`;
}

export function auditLogsToJson(orgId: string, logs: readonly AuditLogEntry[]): string {
  return JSON.stringify(
    {
      orgId,
      exportedAt: new Date().toISOString(),
      count: logs.length,
      logs,
    },
    null,
    2,
  );
}
