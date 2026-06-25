import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, BookOpen, Cpu, Database, FileText, Layers, RefreshCw,
  Shield, Sparkles, Users, Zap, BookMarked, PenLine,
} from 'lucide-react';
import type { ActivityItem, Course, LearnerModel, UserSettings } from '../types';
import { fetchTeacherDashboard } from '../lib/authClient';
import { listLearningEvents, countLearningEventsByType } from '../lib/learningEvents';
import type { TeacherDashboardResponse } from '../lib/teacherDashboardTypes';
import { getTeacherContent } from '../lib/teacherContent';
import { formatDateTime, formatShortDate, localeTag } from '../lib/localeFormat';
import { cn } from '../utils/cn';

interface Props {
  settings: UserSettings;
  lang?: 'en' | 'el';
  localCourses?: Course[];
  activities?: ActivityItem[];
  learnerModel?: LearnerModel;
  onOpenCourse?: (courseId: string) => void;
}

export function TeacherDashboard({
  settings,
  lang = settings.language ?? 'en',
  localCourses = [],
  activities = [],
  learnerModel,
  onOpenCourse,
}: Props) {
  const ui = getTeacherContent(lang);
  const [data, setData] = useState<TeacherDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const localEvents = countLearningEventsByType();
  const recentEvents = listLearningEvents(8);
  const locale = localeTag(lang);
  const localCourseIds = new Set(localCourses.map((c) => c.id));

  const load = useCallback(async () => {
    if (!settings.authToken?.trim()) {
      setError(ui.signInRequired);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await fetchTeacherDashboard(settings.authToken, settings);
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [settings.authToken, settings, ui.signInRequired]);

  useEffect(() => {
    void load();
  }, [load]);

  const usagePct = data
    ? Math.min(100, Math.round(((data.usage.promptTokens + data.usage.completionTokens) / Math.max(1, data.usage.quota)) * 100))
    : 0;
  const studyHours = learnerModel ? Math.round(learnerModel.totalStudyTime / 60) : 0;

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
                <li className="text-[10px] uppercase tracking-wide text-text-muted font-medium">{ui.recentAnnotations}</li>
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
              <strong>{activities.length}</strong> activities
            </span>
          </div>
        )}
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">{ui.learningEvents}</h3>
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

      {!settings.authToken && (
        <div className="rounded-xl border border-border-subtle bg-surface-hover/40 p-4 text-sm text-text-secondary flex gap-3">
          <Shield className="w-5 h-5 text-brand-400 shrink-0" />
          <p>{ui.signInHint}</p>
        </div>
      )}

      <div className="text-[10px] text-text-muted flex items-center gap-1.5">
        <Database className="w-3 h-3" />
        <Sparkles className="w-3 h-3" />
        {ui.syncFooter}
      </div>
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
