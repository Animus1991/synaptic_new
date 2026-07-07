import { useCallback, useEffect, useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, BookOpen, Cpu, Database, FileText, Layers, RefreshCw,
  Shield, Sparkles, Users, Zap, BookMarked, PenLine,
} from '@/lib/lucide-shim';
import type { ActivityItem, Course, LearnerModel, UserSettings } from '../types';
import {
  addClassEnrollment as apiAddEnrollment,
  createTeacherClass,
  createClassAssignment as apiCreateAssignment,
  createClassAnnouncement as apiCreateAnnouncement,
  fetchClassAnnouncements,
  fetchClassAssignments,
  fetchClassGradebook,
  fetchClassRoster,
  fetchTeacherClasses,
  fetchTeacherDashboard,
  removeClassAnnouncement as apiRemoveAnnouncement,
  removeClassAssignment as apiRemoveAssignment,
  removeClassEnrollment as apiRemoveEnrollment,
  updateGradebookCell,
} from '../lib/authClient';
import type { AnnouncementRow, AssignmentRow, ClassEnrollmentRow, GradebookCellRow, TeacherClassRow } from '../lib/teacherClassTypes';
import { listLearningEvents, countLearningEventsByType } from '../lib/learningEvents';
import type { TeacherDashboardResponse } from '../lib/teacherDashboardTypes';
import { getTeacherContent } from '../lib/teacherContent';
import { fetchOrgs, fetchOrgAnalytics, downloadGradebookCsv, linkLtiClassContext, ltiPassbackClassGrades, syncLtiClassRoster, type OrgAnalytics } from '../lib/orgClient';
import { CohortHeatmap } from './CohortHeatmap';
import { CohortNotebookLmHeatmap } from './CohortNotebookLmHeatmap';
import { CohortTopicMasteryHeatmap } from './CohortTopicMasteryHeatmap';
import { AssignmentDiscussionThread } from './AssignmentDiscussionThread';
import { formatDateTime, formatShortDate, localeTag } from '../lib/localeFormat';
import { cn } from '../utils/cn';

interface Props {
  settings: UserSettings;
  lang?: 'en' | 'el';
  localCourses?: Course[];
  activities?: ActivityItem[];
  learnerModel?: LearnerModel;
  ltiLaunchHint?: {
    contextId: string;
    contextTitle?: string;
    email?: string;
    linkedClassId?: string;
  } | null;
  onOpenCourse?: (courseId: string) => void;
  onOpenSettings?: () => void;
}

export function TeacherDashboard({
  settings,
  lang = settings.language ?? 'en',
  localCourses = [],
  activities = [],
  learnerModel,
  ltiLaunchHint = null,
  onOpenCourse,
  onOpenSettings,
}: Props) {
  const ui = getTeacherContent(lang);
  const [data, setData] = useState<TeacherDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<TeacherClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<ClassEnrollmentRow[]>([]);
  const [classNameInput, setClassNameInput] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [gradebookCells, setGradebookCells] = useState<GradebookCellRow[]>([]);
  const [ltiPassbackMsg, setLtiPassbackMsg] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
  const [ltiContextInput, setLtiContextInput] = useState('');
  const [ltiRosterOpen, setLtiRosterOpen] = useState(false);
  const [ltiRosterMsg, setLtiRosterMsg] = useState<string | null>(null);
  const [classBusy, setClassBusy] = useState(false);
  const [orgAnalytics, setOrgAnalytics] = useState<OrgAnalytics | null>(null);
  const localEvents = countLearningEventsByType();
  const recentEvents = listLearningEvents(8);
  const locale = localeTag(lang);
  const localCourseIds = new Set(localCourses.map((c) => c.id));

  const signedIn = Boolean(settings.authToken?.trim());

  const load = useCallback(async () => {
    if (!settings.authToken?.trim()) {
      setError(null);
      setData(null);
      setClasses([]);
      setRoster([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [json, classJson] = await Promise.all([
        fetchTeacherDashboard(settings.authToken, settings),
        fetchTeacherClasses(settings.authToken, settings),
      ]);
      setData(json);
      setClasses(classJson.classes);
      if (classJson.classes.length === 0) {
        setSelectedClassId(null);
        setRoster([]);
      }
      try {
        const orgJson = await fetchOrgs(settings.authToken, settings);
        if (orgJson.orgs[0]) {
          const analytics = await fetchOrgAnalytics(settings.authToken, settings, orgJson.orgs[0]!.id);
          setOrgAnalytics(analytics);
        } else {
          setOrgAnalytics(null);
        }
      } catch {
        setOrgAnalytics(null);
      }
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [settings.authToken, settings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (classes.length === 0) return;
    setSelectedClassId((prev) => (prev && classes.some((c) => c.id === prev) ? prev : classes[0]!.id));
  }, [classes]);

  useEffect(() => {
    if (!ltiLaunchHint?.contextId) return;
    setLtiContextInput(ltiLaunchHint.contextId);
    setLtiRosterOpen(true);
    if (ltiLaunchHint.linkedClassId) {
      setSelectedClassId(ltiLaunchHint.linkedClassId);
    }
  }, [ltiLaunchHint]);

  const loadRoster = useCallback(async (classId: string) => {
    if (!settings.authToken?.trim()) return;
    const rosterJson = await fetchClassRoster(settings.authToken, settings, classId);
    setRoster(rosterJson.roster);
  }, [settings.authToken, settings]);

  const loadAssignments = useCallback(async (classId: string) => {
    if (!settings.authToken?.trim()) return;
    const json = await fetchClassAssignments(settings.authToken, settings, classId);
    setAssignments(json.assignments);
  }, [settings.authToken, settings]);

  const loadAnnouncements = useCallback(async (classId: string) => {
    if (!settings.authToken?.trim()) return;
    const json = await fetchClassAnnouncements(settings.authToken, settings, classId);
    setAnnouncements(json.announcements);
  }, [settings.authToken, settings]);

  const loadGradebook = useCallback(async (classId: string) => {
    if (!settings.authToken?.trim()) return;
    const json = await fetchClassGradebook(settings.authToken, settings, classId);
    setGradebookCells(json.cells);
  }, [settings.authToken, settings]);

  const gradebookCellScore = useCallback(
    (enrollmentId: string, assignmentId: string) =>
      gradebookCells.find((c) => c.enrollmentId === enrollmentId && c.assignmentId === assignmentId)?.score,
    [gradebookCells],
  );

  const handleGradebookScoreChange = async (
    enrollmentId: string,
    assignmentId: string,
    raw: string,
  ) => {
    if (!settings.authToken?.trim() || !selectedClassId) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const score = Number(trimmed);
    if (!Number.isFinite(score)) return;
    setClassBusy(true);
    try {
      const cell = await updateGradebookCell(settings.authToken, settings, selectedClassId, {
        enrollmentId,
        assignmentId,
        score,
        status: 'graded',
      });
      setGradebookCells((prev) => {
        const next = prev.filter(
          (c) => !(c.enrollmentId === enrollmentId && c.assignmentId === assignmentId),
        );
        next.push(cell);
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  useEffect(() => {
    if (!settings.authToken?.trim() || !selectedClassId) {
      setRoster([]);
      setAssignments([]);
      setAnnouncements([]);
      setGradebookCells([]);
      return;
    }
    void loadRoster(selectedClassId).catch((err: Error) => setError(err.message));
    void loadAssignments(selectedClassId).catch((err: Error) => setError(err.message));
    void loadAnnouncements(selectedClassId).catch((err: Error) => setError(err.message));
    void loadGradebook(selectedClassId).catch((err: Error) => setError(err.message));
  }, [settings.authToken, selectedClassId, loadRoster, loadAssignments, loadAnnouncements, loadGradebook]);

  const handleCreateClass = async () => {
    if (!settings.authToken?.trim() || !classNameInput.trim()) return;
    setClassBusy(true);
    try {
      const created = await createTeacherClass(settings.authToken, settings, {
        name: classNameInput.trim(),
      });
      setClassNameInput('');
      setClasses((prev) => [created, ...prev]);
      setSelectedClassId(created.id);
      setRoster([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
  };

  const handleAddStudent = async () => {
    if (!settings.authToken?.trim() || !selectedClassId || !studentEmail.trim()) return;
    setClassBusy(true);
    try {
      await apiAddEnrollment(settings.authToken, settings, selectedClassId, {
        email: studentEmail.trim(),
        displayName: studentName.trim() || undefined,
      });
      setStudentEmail('');
      setStudentName('');
      await loadRoster(selectedClassId);
      const classJson = await fetchTeacherClasses(settings.authToken, settings);
      setClasses(classJson.classes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId: string) => {
    if (!settings.authToken?.trim() || !selectedClassId) return;
    setClassBusy(true);
    try {
      await apiRemoveEnrollment(settings.authToken, settings, selectedClassId, enrollmentId);
      await loadRoster(selectedClassId);
      const classJson = await fetchTeacherClasses(settings.authToken, settings);
      setClasses(classJson.classes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!settings.authToken?.trim() || !selectedClassId || !assignmentTitle.trim()) return;
    setClassBusy(true);
    try {
      await apiCreateAssignment(settings.authToken, settings, selectedClassId, {
        title: assignmentTitle.trim(),
        dueAt: assignmentDue.trim() || undefined,
      });
      setAssignmentTitle('');
      setAssignmentDue('');
      await loadAssignments(selectedClassId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!settings.authToken?.trim() || !selectedClassId) return;
    setClassBusy(true);
    try {
      await apiRemoveAssignment(settings.authToken, settings, selectedClassId, assignmentId);
      await loadAssignments(selectedClassId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!settings.authToken?.trim() || !selectedClassId || !announcementTitle.trim() || !announcementBody.trim()) {
      return;
    }
    setClassBusy(true);
    try {
      await apiCreateAnnouncement(settings.authToken, settings, selectedClassId, {
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
      });
      setAnnouncementTitle('');
      setAnnouncementBody('');
      await loadAnnouncements(selectedClassId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleRemoveAnnouncement = async (announcementId: string) => {
    if (!settings.authToken?.trim() || !selectedClassId) return;
    setClassBusy(true);
    try {
      await apiRemoveAnnouncement(settings.authToken, settings, selectedClassId, announcementId);
      await loadAnnouncements(selectedClassId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleLinkLtiContext = async () => {
    if (!settings.authToken?.trim() || !selectedClassId || !ltiContextInput.trim()) return;
    setClassBusy(true);
    setLtiRosterMsg(null);
    try {
      await linkLtiClassContext(settings.authToken, settings, selectedClassId, {
        ltiContextId: ltiContextInput.trim(),
        contextTitle: ltiLaunchHint?.contextTitle,
      });
      setLtiRosterMsg(ui.ltiRosterLinked);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const handleSyncLtiRoster = async () => {
    if (!settings.authToken?.trim() || !selectedClassId) return;
    setClassBusy(true);
    setLtiRosterMsg(null);
    try {
      const result = await syncLtiClassRoster(settings.authToken, settings, selectedClassId, {
        ltiContextId: ltiContextInput.trim() || undefined,
        useStub: Boolean(ltiLaunchHint),
      });
      await loadRoster(selectedClassId);
      const classJson = await fetchTeacherClasses(settings.authToken, settings);
      setClasses(classJson.classes);
      setLtiRosterMsg(`${ui.ltiRosterSyncDone}: +${result.added} (${result.source})`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClassBusy(false);
    }
  };

  const usagePct = data
    ? Math.min(100, Math.round(((data.usage.promptTokens + data.usage.completionTokens) / Math.max(1, data.usage.quota)) * 100))
    : 0;
  const studyHours = learnerModel ? Math.round(learnerModel.totalStudyTime / 60) : 0;
  const discussionUi = {
    toggle: ui.discussionToggle,
    hint: ui.discussionHint,
    placeholder: ui.discussionPlaceholder,
    post: ui.discussionPost,
    empty: ui.discussionEmpty,
    roleTeacher: ui.discussionRoleTeacher,
    roleStudent: ui.discussionRoleStudent,
    remove: ui.removeDiscussionPost,
    reply: ui.discussionReply,
    askPlaceholder: ui.discussionAskPlaceholder,
    replyPlaceholder: ui.discussionReplyPlaceholder,
  };

  return (
    <div className="p-4 sm:p-6 lg:px-8 pb-24 space-y-6 max-w-5xl mx-auto" data-testid="teacher-dashboard">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-400" />
            {ui.title}
          </h1>
          <p className="text-sm text-text-secondary mt-1">{ui.subtitle}</p>
          {data?.syncedAt && (
            <p className="text-[10px] text-text-muted mt-1">
              {ui.lastSynced}: {formatDateTime(data.syncedAt, lang)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          data-testid="teacher-refresh"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle text-sm hover:border-brand-500/30 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {ui.refresh}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose" role="alert">
          {error}
        </div>
      )}

      {signedIn && (
        <div
          className="rounded-xl border border-border-subtle bg-surface-card/60 px-4 py-3 text-xs text-text-secondary space-y-2"
          data-testid="teacher-cohort-roadmap"
        >
          <p>{ui.cohortRoadmap}</p>
          {orgAnalytics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border-subtle/50" data-testid="teacher-cohort-analytics">
              <div>
                <p className="text-[10px] text-text-muted">{ui.cohortStudents}</p>
                <p className="text-sm font-semibold text-text-primary">{orgAnalytics.totalStudents}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">{ui.cohortCompletion}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {orgAnalytics.completionRate != null ? `${Math.round(orgAnalytics.completionRate * 100)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">{ui.cohortAvgMastery}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {orgAnalytics.avgMastery != null ? `${Math.round(orgAnalytics.avgMastery)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">{ui.cohortAvgScore}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {orgAnalytics.avgScore != null ? `${Math.round(orgAnalytics.avgScore)}%` : '—'}
                </p>
              </div>
              </div>
              <CohortHeatmap analytics={orgAnalytics} lang={lang} />
              <CohortTopicMasteryHeatmap analytics={orgAnalytics} lang={lang} />
              <CohortNotebookLmHeatmap analytics={orgAnalytics} lang={lang} />
            </>
          ) : (
            <p className="text-[10px] text-text-muted">{ui.noOrgAnalytics}</p>
          )}
        </div>
      )}

      {!signedIn && (
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 text-sm text-text-secondary flex gap-3 items-start">
          <Shield className="w-5 h-5 text-brand-400 shrink-0" />
          <div className="space-y-2">
            <p className="font-medium text-text-primary">{ui.signInRequired}</p>
            <p>{ui.signInHint}</p>
            {onOpenSettings && (
              <button
                type="button"
                data-testid="teacher-open-settings"
                onClick={onOpenSettings}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                {ui.openSettingsCta}
              </button>
            )}
          </div>
        </div>
      )}

      {settings.authToken && (
        <div
          className="rounded-2xl border border-border-subtle bg-surface-card p-5 space-y-4"
          data-testid="teacher-class-rosters"
        >
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              {ui.classRosters}
            </h2>
            <p className="text-xs text-text-muted mt-1">{ui.classRostersHint}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              placeholder={ui.classNamePlaceholder}
              data-testid="teacher-class-name"
              className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCreateClass()}
              disabled={classBusy || !classNameInput.trim()}
              data-testid="teacher-create-class"
              className="px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {ui.createClass}
            </button>
          </div>

          {classes.length === 0 ? (
            <p className="text-xs text-text-muted">{ui.noClasses}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  data-testid={`teacher-class-tab-${cls.id}`}
                  onClick={() => handleSelectClass(cls.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    selectedClassId === cls.id
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                      : 'border-border-subtle hover:border-brand-500/20',
                  )}
                >
                  {cls.name}
                  <span className="ml-1.5 text-text-muted">({cls.studentCount ?? 0})</span>
                </button>
              ))}
            </div>
          )}

          {selectedClassId && (
            <div className="space-y-3 pt-2 border-t border-border-subtle">
              <div className="flex flex-wrap gap-2 items-end">
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder={ui.studentEmailPlaceholder}
                  data-testid="teacher-student-email"
                  className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={ui.studentNamePlaceholder}
                  data-testid="teacher-student-name"
                  className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleAddStudent()}
                  disabled={classBusy || !studentEmail.trim()}
                  data-testid="teacher-add-student"
                  className="px-3 py-2 rounded-xl border border-brand-500/30 text-brand-300 text-sm font-medium disabled:opacity-50"
                >
                  {ui.addStudent}
                </button>
              </div>

              {roster.length === 0 ? (
                <p className="text-xs text-text-muted">{ui.noStudents}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-text-muted border-b border-border-subtle">
                        <th className="text-left py-2 pr-3">{ui.colStudent}</th>
                        <th className="text-left py-2 pr-3">{ui.colEmail}</th>
                        <th className="text-left py-2 pr-3">{ui.colMastery}</th>
                        <th className="text-left py-2 pr-3">{ui.colEnrolled}</th>
                        <th className="text-right py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((row) => (
                        <tr key={row.id} className="border-b border-border-subtle/50" data-testid={`teacher-roster-row-${row.id}`}>
                          <td className="py-2 pr-3">{row.displayName ?? '—'}</td>
                          <td className="py-2 pr-3">{row.studentEmail}</td>
                          <td className="py-2 pr-3">{row.mastery != null ? `${row.mastery}%` : '—'}</td>
                          <td className="py-2 pr-3 text-text-muted">{formatShortDate(row.enrolledAt, lang)}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => void handleRemoveStudent(row.id)}
                              disabled={classBusy}
                              data-testid={`teacher-remove-student-${row.id}`}
                              className="text-accent-rose hover:underline"
                            >
                              {ui.removeStudent}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-4 border-t border-border-subtle" data-testid="teacher-lti-roster">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm font-semibold"
                  onClick={() => setLtiRosterOpen((v) => !v)}
                >
                  <span>{ui.ltiRosterTitle}</span>
                  <span className="text-[10px] text-text-muted">{ltiRosterOpen ? '−' : '+'}</span>
                </button>
                {ltiRosterOpen && (
                  <div className="mt-3 space-y-2">
                    {ltiLaunchHint && (
                      <p className="text-[11px] text-accent-cyan border border-accent-cyan/30 rounded-lg px-3 py-2">
                        {ui.ltiLaunchWelcome}
                        {ltiLaunchHint.contextTitle ? ` — ${ltiLaunchHint.contextTitle}` : ''}
                        {ltiLaunchHint.contextId ? ` (${ltiLaunchHint.contextId})` : ''}
                      </p>
                    )}
                    <p className="text-[11px] text-text-muted">{ui.ltiRosterHint}</p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <input
                        type="text"
                        value={ltiContextInput}
                        onChange={(e) => setLtiContextInput(e.target.value)}
                        placeholder={ui.ltiRosterContextPlaceholder}
                        data-testid="teacher-lti-context-id"
                        className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void handleLinkLtiContext()}
                        disabled={classBusy || !ltiContextInput.trim()}
                        data-testid="teacher-lti-link-context"
                        className="px-3 py-2 rounded-xl border border-brand-500/30 text-brand-300 text-sm"
                      >
                        {ui.ltiRosterLink}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSyncLtiRoster()}
                        disabled={classBusy || !ltiContextInput.trim()}
                        data-testid="teacher-lti-roster-sync"
                        className="px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {ui.ltiRosterSync}
                      </button>
                    </div>
                    {ltiRosterMsg && (
                      <p className="text-[10px] text-accent-cyan" data-testid="teacher-lti-roster-msg">
                        {ltiRosterMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border-subtle" data-testid="teacher-announcements">
                <h3 className="text-sm font-semibold">{ui.announcements}</h3>
                <p className="text-[11px] text-text-muted">{ui.announcementsHint}</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder={ui.announcementTitlePlaceholder}
                    data-testid="teacher-announcement-title"
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                  />
                  <textarea
                    value={announcementBody}
                    onChange={(e) => setAnnouncementBody(e.target.value)}
                    placeholder={ui.announcementBodyPlaceholder}
                    rows={3}
                    data-testid="teacher-announcement-body"
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm resize-y min-h-[72px]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateAnnouncement()}
                    disabled={classBusy || !announcementTitle.trim() || !announcementBody.trim()}
                    data-testid="teacher-create-announcement"
                    className="px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {ui.createAnnouncement}
                  </button>
                </div>
                {announcements.length === 0 ? (
                  <p className="text-xs text-text-muted">{ui.noAnnouncements}</p>
                ) : (
                  <ul className="space-y-2">
                    {announcements.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-xl border border-border-subtle/60 p-3 text-xs"
                        data-testid={`teacher-announcement-row-${row.id}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium">{row.title}</p>
                            <p className="text-text-muted whitespace-pre-wrap">{row.body}</p>
                            <p className="text-[10px] text-text-muted">
                              {formatDateTime(row.createdAt, lang)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemoveAnnouncement(row.id)}
                            disabled={classBusy}
                            className="text-accent-rose hover:underline shrink-0"
                          >
                            {ui.removeAnnouncement}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border-subtle" data-testid="teacher-assignments">
                <h3 className="text-sm font-semibold">{ui.assignments}</h3>
                <p className="text-[11px] text-text-muted">{ui.assignmentsHint}</p>
                <div className="flex flex-wrap gap-2 items-end">
                  <input
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder={ui.assignmentTitlePlaceholder}
                    data-testid="teacher-assignment-title"
                    className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                  />
                  <input
                    type="date"
                    value={assignmentDue}
                    onChange={(e) => setAssignmentDue(e.target.value)}
                    placeholder={ui.assignmentDuePlaceholder}
                    data-testid="teacher-assignment-due"
                    className="px-3 py-2 rounded-xl border border-border-subtle bg-surface-primary text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateAssignment()}
                    disabled={classBusy || !assignmentTitle.trim()}
                    data-testid="teacher-create-assignment"
                    className="px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {ui.createAssignment}
                  </button>
                </div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-text-muted">{ui.noAssignments}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-text-muted border-b border-border-subtle">
                          <th className="text-left py-2 pr-3">{ui.colTitle}</th>
                          <th className="text-left py-2 pr-3">{ui.colDue}</th>
                          <th className="text-right py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((row) => (
                          <Fragment key={row.id}>
                            <tr className="border-b border-border-subtle/50" data-testid={`teacher-assignment-row-${row.id}`}>
                              <td className="py-2 pr-3 font-medium">{row.title}</td>
                              <td className="py-2 pr-3 text-text-muted">
                                {row.dueAt ? formatShortDate(row.dueAt, lang) : '—'}
                              </td>
                              <td className="py-2 text-right space-x-2">
                                {selectedClassId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedDiscussionId((prev) => (prev === row.id ? null : row.id))
                                    }
                                    data-testid={`teacher-discussion-toggle-${row.id}`}
                                    className="text-accent hover:underline text-[10px]"
                                  >
                                    {ui.discussionToggle}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveAssignment(row.id)}
                                  disabled={classBusy}
                                  data-testid={`teacher-remove-assignment-${row.id}`}
                                  className="text-accent-rose hover:underline"
                                >
                                  {ui.removeAssignment}
                                </button>
                              </td>
                            </tr>
                            {expandedDiscussionId === row.id && selectedClassId && (
                              <tr>
                                <td colSpan={3} className="pb-3">
                                  <AssignmentDiscussionThread
                                    classId={selectedClassId}
                                    assignmentId={row.id}
                                    assignmentTitle={row.title}
                                    settings={settings}
                                    lang={lang}
                                    role="teacher"
                                    ui={discussionUi}
                                    hideToggle
                                    open
                                    onToggle={() => setExpandedDiscussionId(null)}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border-subtle" data-testid="teacher-gradebook">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{ui.gradebook}</h3>
                  {selectedClassId && settings.authToken && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        data-testid="teacher-export-gradebook"
                        className="text-xs text-brand-700 hover:underline"
                        onClick={() => {
                          void downloadGradebookCsv(settings.authToken!, settings, selectedClassId).then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `gradebook-${selectedClassId}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                        }}
                      >
                        {ui.exportGradebookCsv}
                      </button>
                      <button
                        type="button"
                        data-testid="teacher-lti-passback"
                        className="text-xs text-accent-cyan hover:underline"
                        onClick={() => {
                          void ltiPassbackClassGrades(
                            settings.authToken!,
                            settings,
                            selectedClassId,
                            gradebookCells,
                            roster,
                          ).then((n) => {
                            setLtiPassbackMsg(n > 0 ? `${ui.ltiPassbackDone} (${n})` : ui.gradebookEmpty);
                          }).catch(() => setLtiPassbackMsg(null));
                        }}
                      >
                        {ui.ltiPassbackGrades}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-text-muted">{ui.gradebookHint}</p>
                {ltiPassbackMsg && (
                  <p className="text-[10px] text-accent-cyan" data-testid="teacher-lti-passback-msg">{ltiPassbackMsg}</p>
                )}
                {roster.length === 0 || assignments.length === 0 ? (
                  <p className="text-xs text-text-muted">{ui.gradebookEmpty}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[480px]">
                      <thead>
                        <tr className="text-text-muted border-b border-border-subtle">
                          <th className="text-left py-2 pr-3 sticky left-0 bg-surface-card">{ui.colStudent}</th>
                          <th className="text-left py-2 pr-3">{ui.colOverallMastery}</th>
                          {assignments.map((asg) => (
                            <th key={asg.id} className="text-left py-2 pr-3 min-w-[72px]" title={asg.title}>
                              {asg.title.length > 14 ? `${asg.title.slice(0, 14)}…` : asg.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((student) => (
                          <tr key={student.id} className="border-b border-border-subtle/50" data-testid={`teacher-gradebook-row-${student.id}`}>
                            <td className="py-2 pr-3 sticky left-0 bg-surface-card font-medium">
                              {student.displayName ?? student.studentEmail}
                            </td>
                            <td className="py-2 pr-3 text-text-muted">
                              {student.mastery != null ? `${student.mastery}%` : '—'}
                            </td>
                            {assignments.map((asg) => {
                              const score = gradebookCellScore(student.id, asg.id);
                              return (
                                <td key={asg.id} className="py-1 pr-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    defaultValue={score ?? ''}
                                    placeholder={ui.gradebookScorePlaceholder}
                                    data-testid={`teacher-grade-${student.id}-${asg.id}`}
                                    disabled={classBusy}
                                    onBlur={(e) => void handleGradebookScoreChange(student.id, asg.id, e.target.value)}
                                    className="w-14 px-2 py-1 rounded-lg border border-border-subtle bg-surface-primary text-center"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && !data && (
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 text-center text-sm text-text-muted">
          {ui.loading}
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={BookOpen} label={ui.courses} value={String(data.library.courseCount)} sub={ui.coursesInLibrary} />
            <StatCard icon={FileText} label={ui.sourceFiles} value={String(data.library.fileCount)} sub={ui.filesUploaded} />
            <StatCard icon={Layers} label={ui.topics} value={String(data.library.topicCount)} sub={ui.topicsTotal} />
            <StatCard icon={BookMarked} label={ui.glossary} value={String(data.library.glossaryCount)} sub={ui.glossaryEntries} />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-amber" />
                {ui.llmUsageMonth} · {data.usage.month}
              </h2>
              <span className="text-xs text-text-muted">
                {data.account.email} · {data.account.plan} {ui.planLabel}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', usagePct > 85 ? 'bg-accent-rose' : 'bg-brand-500')}
                style={{ width: `${usagePct}%` }}
                role="progressbar"
                aria-valuenow={usagePct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div><p className="text-lg font-bold">{data.usage.requests}</p><p className="text-text-muted">{ui.requests}</p></div>
              <div><p className="text-lg font-bold">{data.usage.promptTokens.toLocaleString(locale)}</p><p className="text-text-muted">Prompt</p></div>
              <div><p className="text-lg font-bold">{data.usage.completionTokens.toLocaleString(locale)}</p><p className="text-text-muted">Completion</p></div>
              <div><p className="text-lg font-bold">{data.usage.remainingTokens.toLocaleString(locale)}</p><p className="text-text-muted">{ui.remaining}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-brand-400" />
              {ui.courseRoster}
            </h2>
            <p className="text-xs text-text-muted mb-4">{ui.courseRosterHint}</p>
            {data.courses.length === 0 ? (
              <p className="text-sm text-text-muted">{ui.noServerCourses}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="teacher-course-roster">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border-subtle">
                      <th className="pb-2 pr-3 font-medium">{ui.colTitle}</th>
                      <th className="pb-2 pr-3 font-medium">{ui.colTopics}</th>
                      <th className="pb-2 pr-3 font-medium">{ui.colFiles}</th>
                      <th className="pb-2 pr-3 font-medium">{ui.colMastery}</th>
                      <th className="pb-2 pr-3 font-medium hidden sm:table-cell">{ui.colStatus}</th>
                      <th className="pb-2 pr-3 font-medium hidden md:table-cell">{ui.colExam}</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.map((course) => (
                      <tr key={course.id} className="border-b border-border-subtle/50 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-text-primary max-w-[180px] truncate">{course.title}</td>
                        <td className="py-2.5 pr-3 text-text-secondary">{course.topicCount}</td>
                        <td className="py-2.5 pr-3 text-text-secondary">{course.fileCount}</td>
                        <td className="py-2.5 pr-3 text-text-secondary">
                          {course.mastery != null ? `${course.mastery}%` : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-text-muted hidden sm:table-cell">{course.status ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-text-muted hidden md:table-cell">
                          {course.examDate ? formatShortDate(course.examDate, lang) : '—'}
                        </td>
                        <td className="py-2.5">
                          {localCourseIds.has(course.id) && onOpenCourse && (
                            <button
                              type="button"
                              onClick={() => onOpenCourse(course.id)}
                              className="text-brand-400 hover:text-brand-300 font-medium"
                            >
                              {ui.openCourse}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-1">
              <PenLine className="w-4 h-4 text-accent-cyan" />
              {ui.publishing}
            </h2>
            <p className="text-xs text-text-muted mb-3">{ui.publishingHint}</p>
            <div className="flex flex-wrap gap-3 text-xs mb-4">
              <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                <strong>{data.publishing.annotationCount}</strong> {ui.annotations}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                <strong>{data.publishing.fileCount}</strong> {ui.annotatedFiles}
              </span>
            </div>
            {data.publishing.recent.length === 0 ? (
              <p className="text-sm text-text-muted">{ui.noAnnotations}</p>
            ) : (
              <ul className="space-y-2 text-xs">
                <li className="text-[10px] text-text-muted font-medium">{ui.recentAnnotations}</li>
                {data.publishing.recent.map((ann) => (
                  <li key={ann.id} className="flex justify-between gap-2 border-b border-border-subtle/50 pb-1.5">
                    <span className="text-text-secondary truncate">
                      <span className="text-brand-300 font-medium">{ann.type}</span>
                      {' · '}
                      {ann.text || ann.fileKey}
                    </span>
                    <span className="text-text-muted shrink-0">{formatDateTime(ann.createdAt, lang)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-accent-cyan" />
              {ui.serverCapabilities}
            </h2>
            <div className="flex flex-wrap gap-2">
              <FeaturePill on={data.features.embeddings} label="Embeddings" />
              <FeaturePill on={data.features.rag} label="RAG" />
              <FeaturePill on={data.features.ner} label="NER" />
              <FeaturePill on={data.features.ocr ?? true} label="OCR" />
              <FeaturePill on={data.features.stripe} label="Stripe" />
            </div>
          </div>
        </motion.div>
      )}

      {signedIn && (
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-brand-300" />
            {ui.localSession}
          </h2>
          <p className="text-xs text-text-muted mb-4">{ui.localSessionHint}</p>
          {learnerModel && (
            <div className="flex flex-wrap gap-3 text-xs mb-4">
              <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300">
                <strong>{learnerModel.streakDays}</strong> {ui.streakDays}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                <strong>{studyHours}</strong> {ui.studyHours}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                <strong>{activities.length}</strong>{' '}
                {activities.length === 1 ? ui.activityOne : ui.activityMany}
              </span>
            </div>
          )}
          <h3 className="text-xs font-semibold text-text-tertiary mb-2">{ui.learningEvents}</h3>
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {Object.entries(localEvents).map(([type, count]) => (
              <span key={type} className="px-2 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                {type}: <strong>{count}</strong>
              </span>
            ))}
            {Object.keys(localEvents).length === 0 && (
              <span className="text-text-muted">{ui.noEvents}</span>
            )}
          </div>
          <ul className="space-y-2 text-xs text-text-secondary">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex justify-between gap-2 border-b border-border-subtle/50 pb-1">
                <span className="font-medium text-text-primary">{e.type}</span>
                <span className="text-text-muted shrink-0">{formatDateTime(e.timestamp, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="text-[10px] text-text-muted flex items-center gap-1.5">
          <Database className="w-3 h-3" />
          <Sparkles className="w-3 h-3" />
          {ui.syncFooter}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
      <Icon className="w-5 h-5 text-brand-400 mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-text-muted">{label} · {sub}</p>
    </div>
  );
}

function FeaturePill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border',
        on ? 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald' : 'border-border-subtle text-text-muted',
      )}
    >
      {on ? '✓' : '○'} {label}
    </span>
  );
}
