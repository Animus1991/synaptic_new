import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, BookOpen, CheckSquare, Bot, LayoutDashboard, BarChart3, Settings, Play, Users, FileText, GraduationCap, LayoutGrid } from '@/lib/lucide-shim';
import type { AppView, Course, GlossaryEntry, Task, UploadedFile } from '../types';
import { cn } from '../utils/cn';
import { useI18n, type I18nKey } from '../lib/i18n';
import { searchUploadedContent, type ContentSearchHit } from '../lib/globalContentSearch';

export type CommandAction =
  | { type: 'navigate'; view: AppView; label: string; icon: typeof Search }
  | { type: 'workspace'; label: string; icon: typeof LayoutGrid }
  | { type: 'task'; taskId: string; label: string; icon: typeof Play }
  | { type: 'session'; session: '10min' | '25min' | 'review'; label: string; icon: typeof Play }
  | { type: 'content'; hit: ContentSearchHit; label: string; sublabel?: string; icon: typeof BookOpen };

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  courses: Course[];
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
  onNavigate: (view: AppView) => void;
  onStartTask: (taskId: string) => void;
  onStartSession: (session: '10min' | '25min' | 'review') => void;
  onContentSelect: (hit: ContentSearchHit) => void;
  onOpenWorkspace?: () => void;
}

const NAV: { view: AppView; labelKey: I18nKey; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
  { view: 'library', labelKey: 'navLibrary', icon: BookOpen },
  { view: 'tasks', labelKey: 'navTasks', icon: CheckSquare },
  { view: 'agent', labelKey: 'navAgent', icon: Bot },
  { view: 'analytics', labelKey: 'navAnalytics', icon: BarChart3 },
  { view: 'teacher', labelKey: 'navTeacher', icon: Users },
  { view: 'settings', labelKey: 'navSettings', icon: Settings },
];

const CONTENT_ICONS = {
  course: GraduationCap,
  topic: BookOpen,
  glossary: FileText,
  note: FileText,
} as const;

export function CommandPalette({
  open,
  onClose,
  tasks,
  courses,
  uploadedFiles,
  glossaryEntries,
  onNavigate,
  onStartTask,
  onStartSession,
  onContentSelect,
  onOpenWorkspace,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const contentHits = useMemo(
    () => searchUploadedContent(query, courses, uploadedFiles, glossaryEntries, 8),
    [query, courses, uploadedFiles, glossaryEntries],
  );

  if (!open) return null;

  const q = query.toLowerCase();
  const navActions: CommandAction[] = NAV
    .filter((n) => t(n.labelKey).toLowerCase().includes(q))
    .map((n) => ({ type: 'navigate', view: n.view, label: t(n.labelKey), icon: n.icon }));

  const taskActions: CommandAction[] = tasks
    .filter((task) => task.status === 'pending' && (task.title.toLowerCase().includes(q) || task.courseName.toLowerCase().includes(q)))
    .slice(0, 6)
    .map((task) => ({ type: 'task', taskId: task.id, label: task.title, icon: Play }));

  const sessionActions: CommandAction[] = [
    { type: 'session' as const, session: '10min' as const, label: t('sessionQuickSprint'), icon: Play },
    { type: 'session' as const, session: '25min' as const, label: t('sessionFocused'), icon: Play },
    { type: 'session' as const, session: 'review' as const, label: t('sessionSpacedReview'), icon: Play },
  ].filter((s) => s.label.toLowerCase().includes(q));

  const contentActions: CommandAction[] = contentHits.map((hit) => ({
    type: 'content' as const,
    hit,
    label: hit.label,
    sublabel: hit.sublabel,
    icon: CONTENT_ICONS[hit.kind],
  }));

  const workspaceAction: CommandAction[] = onOpenWorkspace
    ? [{ type: 'workspace' as const, label: t('navStudyWorkspace'), icon: LayoutGrid }].filter((a) => a.label.toLowerCase().includes(q))
    : [];

  const actions = [...workspaceAction, ...contentActions, ...navActions, ...taskActions, ...sessionActions];

  const run = (a: CommandAction) => {
    if (a.type === 'navigate') onNavigate(a.view);
    if (a.type === 'workspace') onOpenWorkspace?.();
    if (a.type === 'task') onStartTask(a.taskId);
    if (a.type === 'session') onStartSession(a.session);
    if (a.type === 'content') onContentSelect(a.hit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4" data-testid="command-palette">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-surface-secondary shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPages')}
            data-testid="command-palette-input"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border-subtle text-text-muted">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {actions.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">{t('noMatches')}</p>
          ) : actions.map((a, i) => (
            <button
              key={`${a.type}-${i}`}
              data-testid={a.type === 'content' ? `command-content-${a.hit.kind}` : undefined}
              onClick={() => run(a)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm',
                'hover:bg-surface-hover transition-colors',
              )}
            >
              <a.icon className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.label}</span>
                {a.type === 'content' && a.sublabel && (
                  <span className="block truncate text-[10px] text-text-muted">{a.sublabel}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, toggle, close, setOpen };
}
