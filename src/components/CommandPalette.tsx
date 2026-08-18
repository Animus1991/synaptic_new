import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Search, BookOpen, CheckSquare, Bot, LayoutDashboard, BarChart3, Settings, Play, Users, FileText, GraduationCap, LayoutGrid, ExternalLink, Network, Sparkles, Zap } from '@/lib/lucide-shim';
import type { AppView, Course, GlossaryEntry, Task, UploadedFile, User } from '../types';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { searchUploadedContent, type ContentSearchHit } from '../lib/globalContentSearch';
import { commandActionKey, loadRecentCommandKeys, recordRecentCommandKey } from '../lib/commandPaletteRecent';
import { paletteNavEntries } from '../lib/navCapabilities';
import type { ShellNavView } from '../lib/navigationRegistry';
import { buildNotebookLmBridgeCommands, type NotebookLmBridgeCommandId } from '../lib/notebooklmBridgeCommands';
import { getTaskActionVisual } from '../lib/taskActionIcons';
import type { LucideIcon } from '@/lib/lucide-shim';
import type { DashboardNextAction } from '../lib/dashboardNextAction';
import { paletteQuickActions, type GlobalQuickActionId } from '../lib/globalActionRegistry';
import { useMinimalTheme } from '../lib/useMinimalTheme';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export type CommandAction =
  | { type: 'navigate'; view: AppView; label: string; icon: typeof Search }
  | { type: 'workspace'; label: string; icon: typeof LayoutGrid }
  | { type: 'next-action'; label: string; sublabel?: string; icon: typeof Play }
  | { type: 'task'; taskId: string; label: string; icon: LucideIcon }
  | { type: 'session'; session: '10min' | '25min' | 'review'; label: string; icon: typeof Play }
  | { type: 'content'; hit: ContentSearchHit; label: string; sublabel?: string; icon: typeof BookOpen }
  | { type: 'nlm-bridge'; bridgeId: NotebookLmBridgeCommandId; label: string; sublabel?: string; icon: typeof ExternalLink }
  | { type: 'quick-action'; actionId: GlobalQuickActionId; label: string; icon: LucideIcon };

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
  dashboardNextAction?: DashboardNextAction | null;
  onDashboardNextAction?: () => void;
  hasSelectedCourse?: boolean;
  onNotebookLmBridge?: (id: NotebookLmBridgeCommandId) => void;
  user: User;
  onQuickAction?: (actionId: GlobalQuickActionId) => void;
}

const PALETTE_QUICK_ICONS: Record<GlobalQuickActionId, LucideIcon> = {
  'note-analysis': Network,
  upload: Sparkles,
  workspace: BookOpen,
  exam: Zap,
};

const PALETTE_NAV_ICONS: Record<ShellNavView, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  library: BookOpen,
  tasks: CheckSquare,
  agent: Bot,
  'study-room': Users,
  analytics: BarChart3,
  teacher: Users,
  'student-org': GraduationCap,
  settings: Settings,
};

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
  dashboardNextAction = null,
  onDashboardNextAction,
  hasSelectedCourse = false,
  onNotebookLmBridge,
  user,
  onQuickAction,
}: Props) {
  const { t, lang } = useI18n();
  const densePalette = useMinimalTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); setActiveIndex(-1); }
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

  const orderedActions = useMemo(() => {
    if (!open) return [] as CommandAction[];
    const q = query.toLowerCase();
    const navActions: CommandAction[] = paletteNavEntries(user)
      .filter((n) => t(n.paletteLabelKey).toLowerCase().includes(q))
      .map((n) => ({
        type: 'navigate' as const,
        view: n.view,
        label: t(n.paletteLabelKey),
        icon: PALETTE_NAV_ICONS[n.view],
      }));

    const quickActionCommands: CommandAction[] = onQuickAction
      ? paletteQuickActions(hasSelectedCourse || courses.length > 0)
          .filter((a) => t(a.labelKey).toLowerCase().includes(q))
          .map((a) => ({
            type: 'quick-action' as const,
            actionId: a.id,
            label: t(a.labelKey),
            icon: PALETTE_QUICK_ICONS[a.id],
          }))
      : [];

    const taskActions: CommandAction[] = tasks
      .filter((task) => task.status === 'pending' && (task.title.toLowerCase().includes(q) || task.courseName.toLowerCase().includes(q)))
      .slice(0, 6)
      .map((task) => ({
        type: 'task' as const,
        taskId: task.id,
        label: task.title,
        icon: getTaskActionVisual(task).icon,
      }));

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

    const nextActionCommands: CommandAction[] =
      dashboardNextAction && onDashboardNextAction && !q.trim()
        ? [{
            type: 'next-action' as const,
            label: dashboardNextAction.label,
            sublabel: dashboardNextAction.reason,
            icon: Play,
          }]
        : [];

    const bridgeActions: CommandAction[] = onNotebookLmBridge
      ? buildNotebookLmBridgeCommands(query, lang, { hasCourse: hasSelectedCourse }).map((cmd) => ({
          type: 'nlm-bridge' as const,
          bridgeId: cmd.id,
          label: cmd.label,
          sublabel: cmd.hint,
          icon: ExternalLink,
        }))
      : [];

    const allActions = [...nextActionCommands, ...bridgeActions, ...quickActionCommands, ...workspaceAction, ...contentActions, ...navActions, ...taskActions, ...sessionActions];

    const recentKeys = loadRecentCommandKeys();
    if (q.trim()) return allActions;
    const recent = recentKeys
      .map((key) => allActions.find((a) => commandActionKey({
        type: a.type,
        label: a.label,
        view: a.type === 'navigate' ? a.view : undefined,
        taskId: a.type === 'task' ? a.taskId : undefined,
        session: a.type === 'session' ? a.session : undefined,
        bridgeId: a.type === 'nlm-bridge' ? a.bridgeId : undefined,
        quickActionId: a.type === 'quick-action' ? a.actionId : undefined,
      }) === key))
      .filter((a): a is CommandAction => !!a);
    const rest = allActions.filter((a) => !recent.includes(a));
    return [...recent, ...rest];
  }, [open, query, t, lang, user, courses, tasks, contentHits, onQuickAction, hasSelectedCourse, onOpenWorkspace, dashboardNextAction, onDashboardNextAction, onNotebookLmBridge]);

  useEffect(() => { setActiveIndex(-1); }, [query]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const run = (a: CommandAction) => {
    recordRecentCommandKey(commandActionKey({
      type: a.type,
      label: a.label,
      view: a.type === 'navigate' ? a.view : undefined,
      taskId: a.type === 'task' ? a.taskId : undefined,
      session: a.type === 'session' ? a.session : undefined,
      bridgeId: a.type === 'nlm-bridge' ? a.bridgeId : undefined,
      quickActionId: a.type === 'quick-action' ? a.actionId : undefined,
    }));
    if (a.type === 'navigate') onNavigate(a.view);
    if (a.type === 'quick-action') onQuickAction?.(a.actionId);
    if (a.type === 'workspace') onOpenWorkspace?.();
    if (a.type === 'next-action') onDashboardNextAction?.();
    if (a.type === 'nlm-bridge') onNotebookLmBridge?.(a.bridgeId);
    if (a.type === 'task') onStartTask(a.taskId);
    if (a.type === 'session') onStartSession(a.session);
    if (a.type === 'content') onContentSelect(a.hit);
    onClose();
  };

  return (
    <div
      className={cn('fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4', densePalette && 'command-palette-dense')}
      data-testid="command-palette"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="ux-elev-popover relative w-full max-w-lg rounded-2xl border border-border-subtle bg-surface-secondary overflow-hidden">
        <div className="command-palette-search flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <Search className="w-4 h-4 text-text-muted" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, orderedActions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, -1));
              } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                const a = orderedActions[activeIndex];
                if (a) run(a);
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActiveIndex(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setActiveIndex(orderedActions.length - 1);
              }
            }}
            placeholder={t('searchPages')}
            data-testid="command-palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `command-option-${activeIndex}` : undefined}
            className="command-palette-input flex-1 bg-transparent type-body outline-none placeholder:text-text-muted"
          />
          <kbd className="type-micro px-1.5 py-0.5 rounded border border-border-subtle text-text-muted">ESC</kbd>
        </div>
        <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-72 overflow-y-auto p-2">
          {orderedActions.length === 0 ? (
            <p className="type-caption text-text-muted text-center py-6">{t('noMatches')}</p>
          ) : orderedActions.map((a, i) => (
            <button
              key={`${a.type}-${i}`}
              type="button"
              id={`command-option-${i}`}
              role="option"
              aria-selected={activeIndex === i}
              data-palette-index={i}
              data-testid={
                a.type === 'content'
                  ? `command-content-${a.hit.kind}`
                  : a.type === 'next-action'
                    ? 'command-next-action'
                    : a.type === 'quick-action'
                      ? `command-quick-${a.actionId}`
                      : undefined
              }
              onClick={() => run(a)}
              className={cn(
                'command-palette-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left type-body',
                'hover:bg-surface-hover transition-colors',
                activeIndex === i && 'bg-surface-hover',
              )}
            >
              <a.icon className="command-palette-item-icon w-4 h-4 text-text-secondary shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.label}</span>
                {a.type === 'content' && a.sublabel && (
                  <span className="command-palette-path block truncate type-micro text-text-muted">{a.sublabel}</span>
                )}
                {a.type === 'next-action' && a.sublabel && (
                  <span className="command-palette-path block truncate type-micro text-text-muted">{a.sublabel}</span>
                )}
                {a.type === 'nlm-bridge' && a.sublabel && (
                  <span className="command-palette-path block truncate type-micro text-text-muted">{a.sublabel}</span>
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

/** B9 — Global palette: defer mount until idle; mount immediately when opened. */
export function AppCommandPaletteMount(props: Props) {
  const { open } = props;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (mounted) return;
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(() => setMounted(true), { timeout: 2200 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMounted(true), 500);
    return () => window.clearTimeout(t);
  }, [mounted]);

  if (!mounted) return null;
  return <CommandPalette {...props} />;
}
