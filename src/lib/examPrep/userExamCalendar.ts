import type { Course, PersonalStudyDate, Task } from '../../types';
import type { StudentAssignmentDue } from '../studentOrgCalendar';

export type UserExamSource = 'settings' | 'course' | 'task' | 'personal' | 'org';

export type UserExamCalendarEntry = {
  id: string;
  date: string;
  title: string;
  body: string;
  source: UserExamSource;
  linkUrl?: string;
};

function dateKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    const sliced = iso.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(sliced) ? sliced : null;
  }
  return new Date(ms).toISOString().slice(0, 10);
}

function isExamTask(task: Task): boolean {
  return (
    task.category === 'exam'
    || task.type === 'exam-prep'
    || task.type === 'timed-test'
    || task.type === 'oral-exam'
  );
}

const EXAM_TITLE = /exam|εξέτασ|τελικ[ήη]|τεστ|panhellen|πανελλήν/i;

function isExamAssignment(row: StudentAssignmentDue): boolean {
  return EXAM_TITLE.test(row.title);
}

export function buildUserExamCalendar(opts: {
  settingsExamDate?: string;
  courses?: readonly Course[];
  tasks?: readonly Task[];
  personalStudyDates?: readonly PersonalStudyDate[];
  orgAssignments?: readonly StudentAssignmentDue[];
  lang?: 'en' | 'el';
  now?: number;
}): UserExamCalendarEntry[] {
  const lang = opts.lang ?? 'en';
  const now = opts.now ?? Date.now();
  const cutoff = now - 86_400_000 * 30;
  const rows: UserExamCalendarEntry[] = [];

  const settingsDate = opts.settingsExamDate ? dateKey(opts.settingsExamDate) : null;
  if (settingsDate) {
    rows.push({
      id: 'user-settings-exam',
      date: settingsDate,
      title: lang === 'el' ? 'Η εξέτασή σου' : 'Your exam',
      body: lang === 'el' ? 'Ημερομηνία εξέτασης από τις ρυθμίσεις.' : 'Exam date from your settings.',
      source: 'settings',
    });
  }

  for (const course of opts.courses ?? []) {
    const date = course.examDate ? dateKey(course.examDate) : null;
    if (!date) continue;
    rows.push({
      id: `user-course-${course.id}`,
      date,
      title: course.title,
      body: lang === 'el' ? 'Ημερομηνία εξέτασης μαθήματος.' : 'Course exam date.',
      source: 'course',
    });
  }

  for (const task of opts.tasks ?? []) {
    if (!isExamTask(task)) continue;
    const raw = task.dueAt || task.scheduledFor;
    const date = raw ? dateKey(raw) : null;
    if (!date) continue;
    rows.push({
      id: `user-task-${task.id}`,
      date,
      title: task.title,
      body: task.courseName,
      source: 'task',
    });
  }

  for (const personal of opts.personalStudyDates ?? []) {
    const date = dateKey(personal.date);
    if (!date) continue;
    rows.push({
      id: `user-personal-${personal.id}`,
      date,
      title: personal.label,
      body: lang === 'el' ? 'Προσωπική ημερομηνία μελέτης.' : 'Personal study date.',
      source: 'personal',
    });
  }

  for (const row of opts.orgAssignments ?? []) {
    if (!isExamAssignment(row)) continue;
    const date = dateKey(row.dueAt);
    if (!date) continue;
    rows.push({
      id: `user-org-${row.classId}-${row.assignmentId}`,
      date,
      title: row.title,
      body: row.className,
      source: 'org',
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((entry) => {
      const t = Date.parse(entry.date);
      if (!Number.isFinite(t) || t < cutoff) return false;
      const key = `${entry.date}|${entry.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
