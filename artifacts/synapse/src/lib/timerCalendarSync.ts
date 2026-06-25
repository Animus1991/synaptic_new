import type { TimerSessionLog } from './workspacePersistence';

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildExamIcs(examIso: string, concept: string, lang: 'en' | 'el' = 'en'): string {
  const uid = `exam-${Date.now()}@synapse-learning`;
  const summary = lang === 'el' ? `Εξέταση: ${concept}` : `Exam: ${concept}`;
  const dt = formatIcsDate(examIso);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse Learning//Study Workspace//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${dt}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(lang === 'el' ? 'Αντίστροφη μέτρηση από Study Timer' : 'Countdown from Study Timer')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildStudySessionsIcs(sessions: TimerSessionLog[], lang: 'en' | 'el' = 'en'): string {
  const events = sessions.map((s, i) => {
    const start = new Date(s.at);
    const end = new Date(start.getTime() + s.minutes * 60 * 1000);
    return [
      'BEGIN:VEVENT',
      `UID:study-${i}-${Date.parse(s.at)}@synapse-learning`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${formatIcsDate(start.toISOString())}`,
      `DTEND:${formatIcsDate(end.toISOString())}`,
      `SUMMARY:${icsEscape(s.label)}`,
      `DESCRIPTION:${icsEscape(lang === 'el' ? `Συνεδρία ${s.preset}` : `Session ${s.preset}`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse Learning//Study Workspace//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
