import type { UserSettings } from '../types';

export type StudentDashboard = {
  email: string;
  classCount: number;
  orgCount: number;
  avgScore: number | null;
  completionRate: number | null;
  overdueCount: number;
  upcomingCount: number;
  classes: {
    classId: string;
    className: string;
    orgId?: string;
    courseId?: string;
    mastery: number | null;
    assignmentCount: number;
    gradedCount: number;
    completionRate: number | null;
    avgScore: number | null;
  }[];
  upcoming: {
    classId: string;
    className: string;
    orgId?: string;
    assignmentId: string;
    title: string;
    dueAt?: string;
    status: 'graded' | 'submitted' | 'pending' | 'overdue';
    score?: number;
  }[];
  generatedAt: string;
};

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

export async function fetchStudentDashboard(
  token: string,
  settings: UserSettings,
): Promise<StudentDashboard> {
  const res = await fetch(`${proxyBase(settings)}/v1/student/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as StudentDashboard;
}
