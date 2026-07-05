import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Building2, RefreshCw, GraduationCap, SlidersHorizontal } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import { getStudentOrgContent } from '../lib/studentOrgContent';
import { fetchStudentClasses, fetchStudentOrgs, fetchStudentAnnouncements } from '../lib/orgClient';
import { fetchStudentDashboard, type StudentDashboard } from '../lib/studentDashboardClient';
import { assignmentStatusLabel, assignmentStatusTone } from '../lib/studentOrgModel';
import { StudentOrgSummary } from './StudentOrgSummary';
import { StudentUpcomingPanel } from './StudentUpcomingPanel';
import { StudentOrgCalendarPanel } from './StudentOrgCalendarPanel';
import { StudentOrgAnnouncementsPanel } from './StudentOrgAnnouncementsPanel';
import type { StudentAssignmentDue } from '../lib/studentOrgCalendar';
import { formatShortDate } from '../lib/localeFormat';
import { cn } from '../utils/cn';

interface Props {
  settings: UserSettings;
  lang?: 'en' | 'el';
  samlEmailHint?: string | null;
  onOpenCourse?: (courseId: string) => void;
  onOpenSettings?: () => void;
}

const statusToneClass: Record<ReturnType<typeof assignmentStatusTone>, string> = {
  positive: 'bg-accent-emerald/15 text-accent-emerald',
  warning: 'bg-accent-amber/15 text-accent-amber',
  neutral: 'bg-surface-hover text-text-secondary',
  negative: 'bg-accent-rose/15 text-accent-rose',
};

export function StudentOrgView({
  settings,
  lang = settings.language ?? 'en',
  samlEmailHint,
  onOpenCourse,
  onOpenSettings,
}: Props) {
  const ui = getStudentOrgContent(lang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [classes, setClasses] = useState<
    Awaited<ReturnType<typeof fetchStudentClasses>>['classes']
  >([]);
  const [orgs, setOrgs] = useState<Awaited<ReturnType<typeof fetchStudentOrgs>>['orgs']>([]);
  const [announcements, setAnnouncements] = useState<
    Awaited<ReturnType<typeof fetchStudentAnnouncements>>['announcements']
  >([]);
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const signedIn = Boolean(settings.authToken?.trim());

  const load = useCallback(async () => {
    if (!settings.authToken?.trim()) {
      setClasses([]);
      setOrgs([]);
      setAnnouncements([]);
      setDashboard(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [classJson, orgJson, dash, annJson] = await Promise.all([
        fetchStudentClasses(settings.authToken, settings),
        fetchStudentOrgs(settings.authToken, settings),
        fetchStudentDashboard(settings.authToken, settings),
        fetchStudentAnnouncements(settings.authToken, settings),
      ]);
      setClasses(classJson.classes);
      setOrgs(orgJson.orgs);
      setDashboard(dash);
      setAnnouncements(annJson.announcements);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredClasses = useMemo(() => {
    if (orgFilter === 'all') return classes;
    return classes.filter((row) => row.class.orgId === orgFilter);
  }, [classes, orgFilter]);

  const classMeta = useMemo(() => {
    const map = new Map(dashboard?.classes.map((c) => [c.classId, c]) ?? []);
    return map;
  }, [dashboard]);

  const calendarAssignments = useMemo((): StudentAssignmentDue[] => {
    const now = Date.now();
    const rows: StudentAssignmentDue[] = [];
    for (const row of filteredClasses) {
      for (const assignment of row.assignments) {
        if (!assignment.dueAt) continue;
        const cell = row.gradeCells.find((c) => c.assignmentId === assignment.id);
        const upcoming = dashboard?.upcoming.find(
          (u) => u.assignmentId === assignment.id && u.classId === row.class.id,
        );
        let status: StudentAssignmentDue['status'] =
          upcoming?.status ??
          (cell?.score != null || cell?.status === 'graded'
            ? 'graded'
            : cell?.status === 'submitted'
              ? 'submitted'
              : 'pending');
        if (status === 'pending') {
          const dueMs = Date.parse(assignment.dueAt);
          if (Number.isFinite(dueMs) && dueMs < now) status = 'overdue';
        }
        rows.push({
          assignmentId: assignment.id,
          classId: row.class.id,
          className: row.class.name,
          title: assignment.title,
          dueAt: assignment.dueAt,
          status,
          score: cell?.score ?? upcoming?.score,
        });
      }
    }
    return rows;
  }, [filteredClasses, dashboard]);

  const announcementClassOptions = useMemo(
    () => filteredClasses.map((row) => ({ id: row.class.id, name: row.class.name })),
    [filteredClasses],
  );

  const filteredAnnouncements = useMemo(() => {
    if (orgFilter === 'all') return announcements;
    const classIds = new Set(filteredClasses.map((row) => row.class.id));
    return announcements.filter((a) => classIds.has(a.classId));
  }, [announcements, orgFilter, filteredClasses]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4" data-testid="student-org-signin">
        <h1 className="text-2xl font-semibold text-text-primary">{ui.title}</h1>
        <p className="text-text-secondary">{ui.signInRequired}</p>
        <p className="text-sm text-text-muted">{ui.signInHint}</p>
        {samlEmailHint && (
          <p className="text-sm text-accent border border-accent/30 rounded-xl px-3 py-2">
            SSO: {samlEmailHint}
          </p>
        )}
        {onOpenSettings && (
          <button type="button" className="platform-btn-primary px-4 py-2 rounded-xl text-sm" onClick={onOpenSettings}>
            Settings
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8" data-testid="student-org-view">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-accent" />
            {ui.title}
          </h1>
          <p className="text-text-secondary mt-1">{ui.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          data-testid="student-org-refresh"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {ui.refresh}
        </button>
      </div>

      {samlEmailHint && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-secondary">
          {ui.samlWelcome} ({samlEmailHint})
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      {dashboard && <StudentOrgSummary dashboard={dashboard} ui={ui} />}

      {dashboard && (
        <StudentUpcomingPanel upcoming={dashboard.upcoming} ui={ui} lang={lang} />
      )}

      <StudentOrgCalendarPanel assignments={calendarAssignments} ui={ui} lang={lang} />

      <StudentOrgAnnouncementsPanel
        announcements={filteredAnnouncements}
        classOptions={announcementClassOptions}
        ui={ui}
        lang={lang}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {ui.myClasses}
          </h2>
          {orgs.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="sr-only">{ui.filterByOrg}</span>
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                data-testid="student-org-filter"
                className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text-primary"
              >
                <option value="all">{ui.filterAllOrgs}</option>
                {orgs.map(({ org }) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="text-sm text-text-muted">{ui.myClassesHint}</p>
        {loading && filteredClasses.length === 0 ? (
          <p className="text-text-muted text-sm">{ui.loading}</p>
        ) : filteredClasses.length === 0 ? (
          <p className="text-text-muted text-sm">{ui.noClasses}</p>
        ) : (
          <div className="grid gap-4">
            {filteredClasses.map((row) => {
              const meta = classMeta.get(row.class.id);
              const completionPct =
                meta?.completionRate != null ? Math.round(meta.completionRate * 100) : null;
              return (
                <motion.div
                  key={row.class.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-surface/60 p-4 space-y-3"
                  data-testid="student-class-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-medium text-text-primary">{row.class.name}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                        {meta && (
                          <span>
                            {meta.gradedCount}/{meta.assignmentCount} {ui.assignmentsCount}
                          </span>
                        )}
                        {row.enrollment.mastery != null && (
                          <span>
                            {ui.colMastery}: {Math.round(row.enrollment.mastery)}%
                          </span>
                        )}
                        {meta?.avgScore != null && (
                          <span>
                            {ui.colAvgScore}: {Math.round(meta.avgScore)}%
                          </span>
                        )}
                      </div>
                      {completionPct != null && (
                        <div className="flex items-center gap-2 pt-1 max-w-xs">
                          <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-text-muted">{completionPct}%</span>
                        </div>
                      )}
                    </div>
                    {row.class.courseId && onOpenCourse && (
                      <button
                        type="button"
                        className="text-sm text-accent hover:underline shrink-0"
                        onClick={() => onOpenCourse(row.class.courseId!)}
                      >
                        {ui.openCourse}
                      </button>
                    )}
                  </div>
                  {row.assignments.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] text-text-muted border-b border-border/50">
                            <th className="p-2">{ui.colAssignments}</th>
                            <th className="p-2">{ui.colDue}</th>
                            <th className="p-2 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.assignments.map((a) => {
                            const cell = row.gradeCells.find((c) => c.assignmentId === a.id);
                            const up = dashboard?.upcoming.find(
                              (u) => u.assignmentId === a.id && u.classId === row.class.id,
                            );
                            const status = up?.status ?? (cell?.score != null ? 'graded' : 'pending');
                            return (
                              <tr key={a.id} className="border-b border-border/30 last:border-0">
                                <td className="p-2 text-text-secondary">{a.title}</td>
                                <td className="p-2 text-text-muted whitespace-nowrap">
                                  {a.dueAt ? formatShortDate(a.dueAt, lang) : '—'}
                                </td>
                                <td className="p-2 text-right">
                                  <span className="inline-flex items-center gap-2 justify-end">
                                    {cell?.score != null && (
                                      <span className="font-medium">{cell.score}%</span>
                                    )}
                                    <span
                                      className={cn(
                                        'text-[10px] px-1.5 py-0.5 rounded-full',
                                        statusToneClass[assignmentStatusTone(status)],
                                      )}
                                    >
                                      {assignmentStatusLabel(status, lang)}
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {ui.myOrgs}
        </h2>
        {orgs.length === 0 ? (
          <p className="text-text-muted text-sm">{ui.noOrgs}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm" data-testid="student-org-table">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="p-3">{ui.colOrg}</th>
                  <th className="p-3">{ui.colRole}</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(({ org, membership }) => (
                  <tr key={org.id} className="border-b border-border/50">
                    <td className="p-3">{org.name}</td>
                    <td className="p-3 capitalize">{membership?.role ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
