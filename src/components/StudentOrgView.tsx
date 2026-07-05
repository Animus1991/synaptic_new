import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Building2, RefreshCw, GraduationCap } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import { getStudentOrgContent } from '../lib/studentOrgContent';
import { fetchStudentClasses, fetchStudentOrgs } from '../lib/orgClient';
import { formatShortDate } from '../lib/localeFormat';
import { cn } from '../utils/cn';

interface Props {
  settings: UserSettings;
  lang?: 'en' | 'el';
  onOpenCourse?: (courseId: string) => void;
  onOpenSettings?: () => void;
}

export function StudentOrgView({
  settings,
  lang = settings.language ?? 'en',
  onOpenCourse,
  onOpenSettings,
}: Props) {
  const ui = getStudentOrgContent(lang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<
    Awaited<ReturnType<typeof fetchStudentClasses>>['classes']
  >([]);
  const [orgs, setOrgs] = useState<Awaited<ReturnType<typeof fetchStudentOrgs>>['orgs']>([]);
  const signedIn = Boolean(settings.authToken?.trim());

  const load = useCallback(async () => {
    if (!settings.authToken?.trim()) {
      setClasses([]);
      setOrgs([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [classJson, orgJson] = await Promise.all([
        fetchStudentClasses(settings.authToken, settings),
        fetchStudentOrgs(settings.authToken, settings),
      ]);
      setClasses(classJson.classes);
      setOrgs(orgJson.orgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">{ui.title}</h1>
        <p className="text-text-secondary">{ui.signInRequired}</p>
        <p className="text-sm text-text-muted">{ui.signInHint}</p>
        {onOpenSettings && (
          <button type="button" className="platform-btn-primary px-4 py-2 rounded-xl text-sm" onClick={onOpenSettings}>
            Settings
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
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
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {ui.refresh}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {ui.myClasses}
        </h2>
        <p className="text-sm text-text-muted">{ui.myClassesHint}</p>
        {loading && classes.length === 0 ? (
          <p className="text-text-muted text-sm">{ui.loading}</p>
        ) : classes.length === 0 ? (
          <p className="text-text-muted text-sm">{ui.noClasses}</p>
        ) : (
          <div className="grid gap-4">
            {classes.map((row) => (
              <motion.div
                key={row.class.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-surface/60 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-text-primary">{row.class.name}</h3>
                    {row.enrollment.mastery != null && (
                      <p className="text-xs text-text-muted">
                        {ui.colMastery}: {Math.round(row.enrollment.mastery)}%
                      </p>
                    )}
                  </div>
                  {row.class.courseId && onOpenCourse && (
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline"
                      onClick={() => onOpenCourse(row.class.courseId!)}
                    >
                      {ui.openCourse}
                    </button>
                  )}
                </div>
                {row.assignments.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {row.assignments.map((a) => {
                      const cell = row.gradeCells.find((c) => c.assignmentId === a.id);
                      return (
                        <li key={a.id} className="flex justify-between gap-2 text-text-secondary">
                          <span>{a.title}</span>
                          <span className="text-text-muted shrink-0">
                            {cell?.score != null ? `${cell.score}%` : cell?.status ?? '—'}
                            {a.dueAt ? ` · ${formatShortDate(a.dueAt, lang)}` : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            ))}
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
            <table className="w-full text-sm">
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
