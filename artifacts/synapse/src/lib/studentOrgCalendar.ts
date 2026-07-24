import type { ExamCalendarEntry } from './examPrep/examCalendarFeed';
import { filterExamCalendar } from './examPrep/examCalendarFeed';

export type StudentCalendarFilter = 'all' | 'assignments' | 'exams';

export type StudentAssignmentDue = {
  assignmentId: string;
  classId: string;
  className: string;
  title: string;
  dueAt: string;
  status: 'graded' | 'submitted' | 'pending' | 'overdue';
  score?: number;
};

export type StudentCalendarEntry = {
  id: string;
  date: string;
  kind: 'assignment' | 'exam';
  title: string;
  subtitle?: string;
  status?: StudentAssignmentDue['status'];
  score?: number;
  linkUrl?: string;
  linkLabel?: string;
};

export type ExamCalendarLabels = {
  title: string;
  body: string;
  linkLabel?: string;
};

function dateKey(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso.slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

export function mergeStudentOrgCalendar(
  assignments: readonly StudentAssignmentDue[],
  examEntries: readonly ExamCalendarEntry[],
  resolveExamLabels: (entry: ExamCalendarEntry) => ExamCalendarLabels,
  filter: StudentCalendarFilter = 'all',
  now = Date.now(),
): StudentCalendarEntry[] {
  const assignmentRows: StudentCalendarEntry[] = assignments
    .filter((row) => row.dueAt?.trim())
    .map((row) => ({
      id: `asn-${row.classId}-${row.assignmentId}`,
      date: dateKey(row.dueAt),
      kind: 'assignment',
      title: row.title,
      subtitle: row.className,
      status: row.status,
      score: row.score,
    }));

  const examRows: StudentCalendarEntry[] = filterExamCalendar([...examEntries], 'all', now).map(
    (entry) => {
      const labels = resolveExamLabels(entry);
      return {
        id: `exam-${entry.id}`,
        date: entry.date,
        kind: 'exam',
        title: labels.title,
        subtitle: labels.body,
        linkUrl: entry.linkUrl,
        linkLabel: labels.linkLabel,
      };
    },
  );

  let merged = [...assignmentRows, ...examRows];
  if (filter === 'assignments') merged = merged.filter((row) => row.kind === 'assignment');
  if (filter === 'exams') merged = merged.filter((row) => row.kind === 'exam');

  return merged.sort((a, b) => {
    const diff = Date.parse(a.date) - Date.parse(b.date);
    if (diff !== 0) return diff;
    if (a.kind !== b.kind) return a.kind === 'assignment' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
