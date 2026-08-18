import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Building2, RefreshCw, GraduationCap, SlidersHorizontal } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import { getStudentOrgContent } from '../lib/studentOrgContent';
import {
  fetchStudentClasses,
  fetchStudentOrgs,
  fetchStudentAnnouncements,
  submitStudentAssignment,
  downloadStudentSubmissionAttachment,
  saveBlobAsFile,
  type StudentAssignmentSubmission,
  type SubmitStudentAssignmentPayload,
  type SubmissionAttachmentMeta,
} from '../lib/orgClient';
import { fetchStudentDashboard, type StudentDashboard } from '../lib/studentDashboardClient';
import { assignmentStatusLabel, assignmentStatusTone } from '../lib/studentOrgModel';
import { StudentOrgSummary } from './StudentOrgSummary';
import { StudentUpcomingPanel } from './StudentUpcomingPanel';
import { StudentOrgCalendarPanel } from './StudentOrgCalendarPanel';
import { StudentOrgAnnouncementsPanel } from './StudentOrgAnnouncementsPanel';
import { AssignmentDiscussionThread } from './AssignmentDiscussionThread';
import type { StudentAssignmentDue } from '../lib/studentOrgCalendar';
import { formatShortDate } from '../lib/localeFormat';
import { UxShimmerPanel } from './ui/UxShimmerSkeleton';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { Page, PageHeader, SectionHeading, CardLink, PrimaryCTA } from './ui/primitives';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { t as i18nT } from '../lib/i18n';
import { cn } from '../utils/cn';
import {
  CLIENT_MAX_ATTACHMENT_BYTES,
  CLIENT_MAX_ATTACHMENTS,
  fileToBase64Payload,
} from '../lib/submissionAttachmentFiles';

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

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
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
  const [expandedDiscussionKey, setExpandedDiscussionKey] = useState<string | null>(null);
  const [expandedSubmitKey, setExpandedSubmitKey] = useState<string | null>(null);
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

  /** Patch local state after a submit so the pill flips without a full refetch. */
  const applySubmissionResult = useCallback(
    (classId: string, result: Awaited<ReturnType<typeof submitStudentAssignment>>) => {
      setClasses((prev) =>
        prev.map((row) => {
          if (row.class.id !== classId) return row;
          const submissions = [
            result.submission,
            ...(row.submissions ?? []).filter((s) => s.assignmentId !== result.submission.assignmentId),
          ];
          const hasCell = row.gradeCells.some((c) => c.assignmentId === result.cell.assignmentId);
          const gradeCells = hasCell
            ? row.gradeCells.map((c) =>
                c.assignmentId === result.cell.assignmentId
                  ? { ...c, status: result.cell.status, score: result.cell.score }
                  : c,
              )
            : [
                ...row.gradeCells,
                {
                  assignmentId: result.cell.assignmentId,
                  status: result.cell.status,
                  score: result.cell.score,
                },
              ];
          return { ...row, submissions, gradeCells };
        }),
      );
      setDashboard((prev) => {
        if (!prev) return prev;
        const upcoming = prev.upcoming.map((row) =>
          row.classId === classId && row.assignmentId === result.submission.assignmentId
            ? {
                ...row,
                status: 'submitted' as const,
                score: result.cell.score ?? row.score,
              }
            : row,
        );
        return { ...prev, upcoming };
      });
    },
    [],
  );

  const openAssignment = useCallback((classId: string, assignmentId: string) => {
    const key = `${classId}:${assignmentId}`;
    setExpandedSubmitKey(key);
    setExpandedDiscussionKey(null);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`student-assignment-${classId}-${assignmentId}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  }, []);

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

  const discussionUi = {
    toggle: ui.discussionToggle,
    hint: ui.discussionHint,
    placeholder: ui.discussionPlaceholder,
    post: ui.discussionPost,
    empty: ui.discussionEmpty,
    roleTeacher: ui.discussionRoleTeacher,
    roleStudent: ui.discussionRoleStudent,
    remove: '',
    reply: ui.discussionReply,
    askPlaceholder: ui.discussionAskPlaceholder,
    replyPlaceholder: ui.discussionReplyPlaceholder,
  };

  if (!signedIn) {
    return (
      <div data-testid="student-org-page" data-type-rhythm="dashboard">
        <Page gap="sm" className="mx-auto max-w-3xl" data-testid="student-org-signin">
          <PageHeader title={ui.title} subtitle={ui.signInRequired} icon={GraduationCap} />
          <p className="type-meta text-text-muted">{ui.signInHint}</p>
          {samlEmailHint && (
            <p className="rounded-lg border-0 bg-brand-500/10 px-3 py-2 type-meta text-text-secondary">
              SSO: {samlEmailHint}
            </p>
          )}
          {onOpenSettings && (
            <PrimaryCTA size="sm" onClick={onOpenSettings} className="self-start">
              {i18nT('settings', lang)}
            </PrimaryCTA>
          )}
        </Page>
      </div>
    );
  }

  return (
    <div
      className="enterprise-calm"
      data-testid="student-org-page"
      data-type-rhythm="dashboard"
      /* Same CTA-only border diet every other shell page already runs. */
      data-border-diet="cta-only"
    >
    <Page gap="sm">
      <PageHeader
        title={ui.title}
        subtitle={ui.subtitle}
        icon={GraduationCap}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            data-testid="student-org-refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            {ui.refresh}
          </Button>
        }
      />

      {samlEmailHint && (
        <CollapsibleChromeSection
          title={i18nT('chromeOrgHints', lang)}
          data-testid="student-org-saml-chrome"
          defaultOpen
        >
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 type-body text-text-secondary">
            {ui.samlWelcome} ({samlEmailHint})
          </div>
        </CollapsibleChromeSection>
      )}

      {error && (
        <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 type-body text-accent-rose" role="alert">
          {error}
        </div>
      )}

      {dashboard && <StudentOrgSummary dashboard={dashboard} ui={ui} />}

      {dashboard && (
        <StudentUpcomingPanel
          upcoming={dashboard.upcoming}
          ui={ui}
          lang={lang}
          onOpenAssignment={openAssignment}
        />
      )}

      <StudentOrgCalendarPanel
        assignments={calendarAssignments}
        ui={ui}
        lang={lang}
        onOpenAssignment={openAssignment}
      />

      <StudentOrgAnnouncementsPanel
        announcements={filteredAnnouncements}
        classOptions={announcementClassOptions}
        ui={ui}
        lang={lang}
      />

      <section className="space-y-3">
        <SectionHeading
          title={ui.myClasses}
          icon={BookOpen}
          size="lg"
          action={
            orgs.length > 1 ? (
              <label className="flex items-center gap-2 type-caption text-text-muted">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="sr-only">{ui.filterByOrg}</span>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  data-testid="student-org-filter"
                  className="student-org-filter min-h-9 rounded-md border-0 bg-surface-secondary/55 px-2 py-1 type-caption text-text-secondary"
                >
                  <option value="all">{ui.filterAllOrgs}</option>
                  {orgs.map(({ org }) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : undefined
          }
        />
        <CollapsibleChromeSection
          title={i18nT('chromeOrgHints', lang)}
          data-testid="student-org-classes-hint-chrome"
        >
          <p className="type-body text-text-muted px-1 pb-2">{ui.myClassesHint}</p>
        </CollapsibleChromeSection>
        {loading && filteredClasses.length === 0 ? (
          <div className="ux-shimmer-panel rounded-panel border border-border-subtle bg-surface-card p-6" role="status" aria-live="polite">
            <UxShimmerPanel lines={4} />
            <p className="mt-3 type-body text-text-muted">{ui.loading}</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <PlatformEmptyState
            title={ui.myClasses}
            description={ui.noClasses}
            icon={null}
            data-testid="student-org-classes-empty"
          />
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
                  className="rounded-panel border border-border-subtle bg-surface-card/60 p-4 space-y-3"
                  data-testid="student-class-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-medium text-text-primary">{row.class.name}</h3>
                      <div className="flex flex-wrap gap-3 type-caption text-text-muted">
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
                        <div className="flex items-center gap-2 pt-1">
                          {/* Wave P-2 C08 — student completion track uses --viz-bar-track. */}
                          <div className="dashboard-progress-track flex-1">
                            <div
                              className="dashboard-progress-fill bg-brand-500"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <span className="type-micro tabular-nums text-text-muted">{completionPct}%</span>
                        </div>
                      )}
                    </div>
                    {row.class.courseId && onOpenCourse && (
                      <CardLink
                        className="student-org-open-course min-h-9"
                        onClick={() => onOpenCourse(row.class.courseId!)}
                      >
                        {ui.openCourse}
                      </CardLink>
                    )}
                  </div>
                  {row.assignments.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-border-subtle/60">
                      <table className="w-full type-body">
                        <thead>
                          <tr className="text-left type-micro text-text-muted border-b border-border-subtle/50">
                            <th className="p-2">{ui.colAssignments}</th>
                            <th className="p-2">{ui.colDue}</th>
                            <th className="p-2 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.assignments.map((a) => {
                            const cell = row.gradeCells.find((c) => c.assignmentId === a.id);
                            const submission = (row.submissions ?? []).find(
                              (s) => s.assignmentId === a.id,
                            );
                            const up = dashboard?.upcoming.find(
                              (u) => u.assignmentId === a.id && u.classId === row.class.id,
                            );
                            // Local cell state wins: right after a submit the dashboard
                            // snapshot is stale, but the patched cell already knows.
                            const cellStatus =
                              cell?.score != null || cell?.status === 'graded'
                                ? ('graded' as const)
                                : cell?.status === 'submitted'
                                  ? ('submitted' as const)
                                  : null;
                            const status = cellStatus ?? up?.status ?? 'pending';
                            const discussionKey = `${row.class.id}:${a.id}`;
                            const discussionOpen = expandedDiscussionKey === discussionKey;
                            const submitOpen = expandedSubmitKey === discussionKey;
                            return (
                              <Fragment key={a.id}>
                                <tr
                                  className="border-b border-border-subtle/30 last:border-0"
                                  id={`student-assignment-${row.class.id}-${a.id}`}
                                >
                                  <td className="p-2 text-text-secondary">
                                    {a.title}
                                    {a.description && (
                                      <span
                                        className="mt-0.5 block type-micro text-text-muted"
                                        data-testid={`student-assignment-description-${a.id}`}
                                      >
                                        {a.description}
                                      </span>
                                    )}
                                    {submission && (
                                      <span className="mt-0.5 block type-micro text-text-muted">
                                        {ui.submittedAtLabel}{' '}
                                        {formatShortDate(submission.updatedAt, lang)}
                                      </span>
                                    )}
                                    {submission?.body && (
                                      <span
                                        className="mt-0.5 block type-micro text-text-secondary line-clamp-2"
                                        data-testid={`student-assignment-submitted-body-${a.id}`}
                                      >
                                        {ui.submittedWorkLabel}: {submission.body}
                                      </span>
                                    )}
                                    {submission?.linkUrl && (
                                      <a
                                        href={submission.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-0.5 block type-micro platform-link"
                                        data-testid={`student-assignment-submitted-link-${a.id}`}
                                      >
                                        {ui.submitLinkLabel}
                                      </a>
                                    )}
                                    {(submission?.attachments ?? []).length > 0 && (
                                      <ul className="mt-0.5 space-y-0.5" data-testid={`student-assignment-submitted-files-${a.id}`}>
                                        {(submission?.attachments ?? []).map((file) => (
                                          <li key={file.id}>
                                            <button
                                              type="button"
                                              className="type-micro platform-link"
                                              data-testid={`student-assignment-submitted-file-${file.id}`}
                                              onClick={() => {
                                                void downloadStudentSubmissionAttachment(
                                                  settings.authToken!,
                                                  settings,
                                                  row.class.id,
                                                  a.id,
                                                  file.id,
                                                ).then(({ blob, filename }) => saveBlobAsFile(blob, filename));
                                              }}
                                            >
                                              {ui.submittedFilesLabel}: {file.name}
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                  <td className="p-2 text-text-muted whitespace-nowrap">
                                    {a.dueAt ? formatShortDate(a.dueAt, lang) : '—'}
                                  </td>
                                  <td className="p-2 text-right">
                                    <span className="inline-flex items-center gap-2 justify-end flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedSubmitKey((prev) =>
                                            prev === discussionKey ? null : discussionKey,
                                          );
                                          setExpandedDiscussionKey(null);
                                        }}
                                        data-testid={`student-submit-toggle-${a.id}`}
                                        className="student-org-discussion-toggle platform-link inline-flex min-h-9 items-center type-micro"
                                      >
                                        {submission ? ui.resubmitToggle : ui.submitToggle}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedDiscussionKey((prev) =>
                                            prev === discussionKey ? null : discussionKey,
                                          );
                                          setExpandedSubmitKey(null);
                                        }}
                                        data-testid={`student-discussion-toggle-${a.id}`}
                                        className="student-org-discussion-toggle platform-link inline-flex min-h-9 items-center type-micro"
                                      >
                                        {ui.discussionToggle}
                                      </button>
                                      {cell?.score != null && (
                                        <span className="font-medium">{cell.score}%</span>
                                      )}
                                      <span
                                        className={cn(
                                          'type-micro px-1.5 py-0.5 rounded-full',
                                          statusToneClass[assignmentStatusTone(status)],
                                        )}
                                      >
                                        {assignmentStatusLabel(status, lang)}
                                      </span>
                                    </span>
                                  </td>
                                </tr>
                                {submitOpen && (
                                  <tr>
                                    <td colSpan={3} className="px-2 pb-3">
                                      <AssignmentSubmitForm
                                        ui={ui}
                                        existing={submission}
                                        graded={cell?.status === 'graded' || cell?.score != null}
                                        onSubmit={async (payload) => {
                                          const result = await submitStudentAssignment(
                                            settings.authToken!,
                                            settings,
                                            row.class.id,
                                            a.id,
                                            payload,
                                          );
                                          applySubmissionResult(row.class.id, result);
                                          setExpandedSubmitKey(null);
                                        }}
                                      />
                                    </td>
                                  </tr>
                                )}
                                {discussionOpen && (
                                  <tr>
                                    <td colSpan={3} className="px-2 pb-3">
                                      <AssignmentDiscussionThread
                                        classId={row.class.id}
                                        assignmentId={a.id}
                                        assignmentTitle={a.title}
                                        settings={settings}
                                        lang={lang}
                                        role="student"
                                        ui={discussionUi}
                                        hideToggle
                                        open
                                        onToggle={() => setExpandedDiscussionKey(null)}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
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
        <SectionHeading title={ui.myOrgs} icon={Building2} size="lg" />
        {orgs.length === 0 ? (
          <PlatformEmptyState
            title={ui.myOrgs}
            description={ui.noOrgs}
            icon={null}
            data-testid="student-org-orgs-empty"
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle/60">
            <table className="w-full type-body" data-testid="student-org-table">
              <thead>
                <tr className="border-b border-border-subtle/50 text-left type-micro text-text-muted">
                  <th className="p-3">{ui.colOrg}</th>
                  <th className="p-3">{ui.colRole}</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(({ org, membership }) => (
                  <tr key={org.id} className="border-b border-border-subtle/50">
                    <td className="p-3">{org.name}</td>
                    <td className="p-3 capitalize">{membership?.role ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
    </div>
  );
}

/** Inline submit/resubmit form — expands under an assignment row like the Q&A thread. */
function AssignmentSubmitForm({
  ui,
  existing,
  graded,
  onSubmit,
}: {
  ui: ReturnType<typeof getStudentOrgContent>;
  existing?: StudentAssignmentSubmission;
  graded?: boolean;
  onSubmit: (payload: SubmitStudentAssignmentPayload) => Promise<void>;
}) {
  const [body, setBody] = useState(existing?.body ?? '');
  const [linkUrl, setLinkUrl] = useState(existing?.linkUrl ?? '');
  const [keptFiles, setKeptFiles] = useState<SubmissionAttachmentMeta[]>(existing?.attachments ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const send = async () => {
    const text = body.trim();
    const link = linkUrl.trim();
    setBusy(true);
    setError(null);
    try {
      const attachments = await Promise.all(newFiles.map((file) => fileToBase64Payload(file)));
      const payload: SubmitStudentAssignmentPayload = {
        body: text,
        linkUrl: link || undefined,
      };
      const filesChanged =
        attachments.length > 0 || keptFiles.length !== (existing?.attachments?.length ?? 0);
      if (filesChanged) {
        payload.keepAttachmentIds = keptFiles.map((f) => f.id);
        payload.attachments = attachments;
      }
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const handleSubmit = async () => {
    const text = body.trim();
    const link = linkUrl.trim();
    if (!text && !link && newFiles.length === 0 && keptFiles.length === 0) {
      setError(ui.submitEmptyError);
      return;
    }
    if (existing) {
      setConfirmOpen(true);
      return;
    }
    await send();
  };

  const handleFiles = (list: FileList | null) => {
    const incoming = list ? Array.from(list) : [];
    if (incoming.some((f) => f.size > CLIENT_MAX_ATTACHMENT_BYTES)) {
      setError(ui.submitFileTooLarge);
      return;
    }
    const next = [...newFiles, ...incoming];
    if (keptFiles.length + next.length > CLIENT_MAX_ATTACHMENTS) {
      setError(ui.submitFilesTooMany);
      return;
    }
    setError(null);
    setNewFiles(next);
  };

  return (
    <div
      className="rounded-lg border border-border-subtle/40 bg-surface-card/60 p-3 space-y-2"
      data-testid="assignment-submit-form"
    >
      <p className="type-micro text-text-muted">{ui.submitHint}</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={ui.submitBodyPlaceholder}
        rows={4}
        data-testid="assignment-submit-body"
        className="w-full px-2 py-1.5 rounded-lg border border-border-subtle bg-surface-card type-body resize-y"
      />
      <input
        type="url"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder={ui.submitLinkPlaceholder}
        data-testid="assignment-submit-link"
        className="w-full px-2 py-1.5 rounded-lg border border-border-subtle bg-surface-card type-body"
      />
      <div className="space-y-1.5">
        <label className="type-micro text-text-secondary" htmlFor="assignment-submit-files">
          {ui.submitFilesLabel}
        </label>
        <p className="type-micro text-text-muted">{ui.submitFilesHint}</p>
        <input
          id="assignment-submit-files"
          type="file"
          multiple
          data-testid="assignment-submit-files"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="block w-full type-caption text-text-secondary"
        />
        {(keptFiles.length > 0 || newFiles.length > 0) && (
          <ul className="space-y-1" data-testid="assignment-submit-file-list">
            {keptFiles.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2 type-caption text-text-secondary">
                <span>{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  data-testid={`assignment-submit-remove-kept-${file.id}`}
                  onClick={() => setKeptFiles((prev) => prev.filter((f) => f.id !== file.id))}
                >
                  {ui.submitRemoveFile}
                </Button>
              </li>
            ))}
            {newFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 type-caption text-text-secondary">
                <span>{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  data-testid={`assignment-submit-remove-new-${index}`}
                  onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                >
                  {ui.submitRemoveFile}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="type-micro text-accent-rose" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={() => void handleSubmit()}
          data-testid="assignment-submit-cta"
        >
          {busy ? ui.submitSending : ui.submitCta}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void send()}
        title={ui.resubmitConfirmTitle}
        description={ui.resubmitConfirmBody}
        confirmLabel={ui.resubmitConfirmCta}
        cancelLabel={ui.resubmitConfirmCancel}
        destructive={Boolean(graded)}
        confirming={busy}
        data-testid="assignment-resubmit-confirm"
      />
    </div>
  );
}
