import type { Task } from '../types';

const PRODID = '-//Synapse Learning//Tasks//EN';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function toDateValue(isoDate: string): string {
  return isoDate.replace(/-/g, '').slice(0, 8);
}

function addDays(yyyyMmDd: string, days: number): string {
  const y = Number(yyyyMmDd.slice(0, 4));
  const m = Number(yyyyMmDd.slice(4, 6)) - 1;
  const d = Number(yyyyMmDd.slice(6, 8));
  const next = new Date(Date.UTC(y, m, d + days));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

/** RFC 5545 TEXT escaping. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold content lines at 75 octets (RFC 5545). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function isDateOnly(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso.trim());
}

function resolveWindow(task: Task, now = new Date()): { start: string; end: string; allDay: boolean } {
  const minutes = Math.max(1, task.estimatedMinutes || 30);
  const raw = (task.dueAt ?? task.scheduledFor ?? '').trim();
  if (raw && isDateOnly(raw)) {
    const start = toDateValue(raw);
    return { start, end: addDays(start, 1), allDay: true };
  }
  const startDate = raw ? new Date(raw) : now;
  const safeStart = Number.isNaN(startDate.getTime()) ? now : startDate;
  const endDate = new Date(safeStart.getTime() + minutes * 60_000);
  return { start: toUtcStamp(safeStart), end: toUtcStamp(endDate), allDay: false };
}

export function taskIcsFilename(task: Task): string {
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${slug || 'task'}.ics`;
}

export function buildTaskIcs(task: Task, now = new Date()): string {
  const { start, end, allDay } = resolveWindow(task, now);
  const uid = `synapse-task-${task.id}@synapse.local`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(task.title)}`,
    `DESCRIPTION:${escapeIcsText([task.description, task.courseName].filter(Boolean).join('\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function downloadTaskIcs(task: Task, now = new Date()): void {
  if (typeof document === 'undefined') return;
  const body = buildTaskIcs(task, now);
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = taskIcsFilename(task);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
