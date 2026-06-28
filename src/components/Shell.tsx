import { ReactNode } from 'react';
import {
  BookOpen, CheckSquare, Robot as Bot, SquaresFour as LayoutDashboard, Gear as Settings,
  Sparkle as Sparkles, List as Menu, X, UploadSimple as Upload, Bell, MagnifyingGlass as Search, CaretRight as ChevronRight,
  ChartBar as BarChart3, Sun, Moon, Users, Fire as Flame, SquaresFour as Layout,
} from '@phosphor-icons/react';
import type { AppView, User, DashboardStats, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { useI18n, type I18nKey } from '../lib/i18n';
import { resolveTheme, themeToggleTarget } from '../lib/theme';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { workspaceLiveIsStale } from '../lib/workspaceStoreSpine';
import { workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';

interface ShellProps {
  children: ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  sidebarOpen: boolean;
  onToggleSidebar: (open: boolean) => void;
  user: User;
  stats: DashboardStats;
  onUpload: () => void;
  theme?: UserSettings['theme'];
  onToggleTheme?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
  breadcrumb?: { course?: string; lesson?: string };
  workspaceLive?: WorkspaceLiveSync | null;
  onOpenWorkspace?: () => void;
  studyWorkspaceOpen?: boolean;
}

type MobileNavItem =
  | { kind: 'view'; view: AppView; icon: typeof BookOpen; labelKey: I18nKey }
  | { kind: 'workspace'; icon: typeof Layout; labelKey: I18nKey };

const navViews: { view: AppView; icon: typeof BookOpen; labelKey: I18nKey }[] = [
  { view: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { view: 'library', icon: BookOpen, labelKey: 'library' },
  { view: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { view: 'agent', icon: Bot, labelKey: 'agent' },
  { view: 'analytics', icon: BarChart3, labelKey: 'analytics' },
  { view: 'teacher', icon: Users, labelKey: 'teacher' },
  { view: 'settings', icon: Settings, labelKey: 'settings' },
];

function buildMobileNavItems(showWorkspace: boolean): MobileNavItem[] {
  const core: MobileNavItem[] = navViews.slice(0, 4).map((item) => ({ kind: 'view' as const, ...item }));
  const items: MobileNavItem[] = [...core];
  if (showWorkspace) {
    items.push({ kind: 'workspace', icon: Layout, labelKey: 'navStudyWorkspace' });
  }
  items.push({ kind: 'view', view: 'settings', icon: Settings, labelKey: 'settings' });
  return items;
}

const shellNavClass = (active: boolean) =>
  cn(
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
    active
      ? 'platform-nav-active'
      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  );

const NAV_SUBTITLES: Partial<Record<AppView, I18nKey>> = {
  dashboard: 'navSubtitleDashboard',
  library: 'navSubtitleLibrary',
  tasks: 'navSubtitleTasks',
  agent: 'navSubtitleAgent',
  analytics: 'navSubtitleAnalytics',
  teacher: 'navSubtitleTeacher',
  settings: 'navSubtitleSettings',
};

export function Shell({
  children,
  currentView,
  onNavigate,
  sidebarOpen,
  onToggleSidebar,
  user,
  stats,
  onUpload,
  theme = 'dark',
  onToggleTheme,
  onOpenSearch,
  onOpenNotifications,
  notificationCount = 0,
  breadcrumb,
  workspaceLive = null,
  onOpenWorkspace,
  studyWorkspaceOpen = false,
}: ShellProps) {
  const { t } = useI18n();
  const showMobileWorkspaceNav = Boolean(
    workspaceLive && !workspaceLiveIsStale(workspaceLive) && onOpenWorkspace,
  );
  const showDesktopWorkspaceNav = Boolean(
    onOpenWorkspace && (studyWorkspaceOpen || showMobileWorkspaceNav),
  );
  const mobileNavItems = buildMobileNavItems(showMobileWorkspaceNav);

  const navButtonProps = (view: AppView) => ({
    'data-testid': `nav-${view}`,
    'data-tour': `nav-${view}`,
  });

  return (
    <div className="min-h-screen bg-surface-primary flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border-subtle bg-surface-secondary/50 fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg platform-brand-icon flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold ws-serif">Synapse</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navViews.map((item) => {
            const insertWorkspaceAfter = item.view === 'agent';
            return (
              <div key={item.view}>
                <button
                  {...navButtonProps(item.view)}
                  onClick={() => onNavigate(item.view)}
                  title={NAV_SUBTITLES[item.view] ? t(NAV_SUBTITLES[item.view]!) : undefined}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen)}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
                  {item.view === 'tasks' && stats.reviewsDue > 0 && (
                    <span className="ml-auto text-xs ws-chip-danger px-2 py-0.5 rounded-full font-semibold">
                      {stats.reviewsDue}
                    </span>
                  )}
                </button>
                {insertWorkspaceAfter && showDesktopWorkspaceNav && (
                  <button
                    type="button"
                    data-testid="nav-workspace"
                    data-tour="nav-workspace"
                    onClick={() => onOpenWorkspace?.()}
                    {...workspaceEntryPrefetchHandlers()}
                    title={t('navSubtitleWorkspace')}
                    className={cn(shellNavClass(studyWorkspaceOpen), 'mt-1')}
                  >
                    <Layout className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left truncate">{t('navStudyWorkspace')}</span>
                    {studyWorkspaceOpen ? (
                      <span className="ml-auto type-micro ws-chip-brand px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                        {t('navContinuingHere')}
                      </span>
                    ) : workspaceLive?.snapshot.toolLabel ? (
                      <span className="ml-auto type-micro ws-chip-neutral px-2 py-0.5 rounded-full font-semibold truncate max-w-[5.5rem]">
                        {workspaceLive.snapshot.toolLabel}
                      </span>
                    ) : null}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={onUpload}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl ws-fab font-medium text-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            {t('uploadMaterial')}
          </button>
        </div>

        <div className="p-3 border-t border-border-subtle">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full platform-brand-icon flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-text-tertiary">Level {user.level} · {user.xp} XP</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => onToggleSidebar(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-secondary border-r border-border-subtle flex flex-col">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg platform-brand-icon flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold ws-serif">Synapse</span>
              </div>
              <button onClick={() => onToggleSidebar(false)} className="p-1.5 rounded-lg hover:bg-surface-hover">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {navViews.map((item) => (
                <button
                  key={item.view}
                  {...navButtonProps(item.view)}
                  onClick={() => onNavigate(item.view)}
                  title={NAV_SUBTITLES[item.view] ? t(NAV_SUBTITLES[item.view]!) : undefined}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen)}
                >
                  <item.icon className="w-5 h-5" />
                  {t(item.labelKey)}
                  {item.view === 'tasks' && stats.reviewsDue > 0 && (
                    <span className="ml-auto text-xs ws-chip-danger px-2 py-0.5 rounded-full font-semibold">
                      {stats.reviewsDue}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="p-3 border-t border-border-subtle">
              <button
                onClick={() => { onUpload(); onToggleSidebar(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl ws-fab font-medium text-sm"
              >
                <Upload className="w-4 h-4" />
                {t('uploadMaterial')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass-strong border-b border-border-subtle">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggleSidebar(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-surface-hover"
              >
                <Menu className="w-5 h-5 text-text-secondary" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-text-tertiary">
                {breadcrumb?.course ? (
                  <>
                    <span className="text-text-secondary font-medium">{breadcrumb.course}</span>
                    {breadcrumb.lesson && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{breadcrumb.lesson}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-text-secondary font-medium capitalize">{currentView}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSearch}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-input border border-border-subtle text-sm text-text-tertiary hover:border-brand-500/30 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{t('search')}</span>
                <kbd className="text-xs bg-surface-hover px-1.5 py-0.5 rounded border border-border-subtle ml-4">⌘K</kbd>
              </button>

              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <Bell className="w-5 h-5 text-text-secondary" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-rose rounded-full" />
                )}
              </button>

              {onToggleTheme && (() => {
                const resolved = resolveTheme(theme ?? 'dark');
                const target = themeToggleTarget(resolved);
                const labelKey: I18nKey = target === 'light' ? 'switchLight' : target === 'spectrum' ? 'switchSpectrum' : 'switchDark';
                return (
                  <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    title={t(labelKey)}
                    aria-label={t(labelKey)}
                  >
                    {target === 'light' ? (
                      <Sun className="w-5 h-5 text-text-secondary" />
                    ) : target === 'spectrum' ? (
                      <Sparkles className="w-5 h-5 text-text-secondary" />
                    ) : (
                      <Moon className="w-5 h-5 text-text-secondary" />
                    )}
                  </button>
                );
              })()}

              <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors">
                <div className="w-7 h-7 rounded-full platform-brand-icon flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-xs font-medium text-accent-amber inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" weight="fill" />
                    {stats.streak}
                  </span>
                  <ChevronRight className="w-3 h-3 text-text-tertiary" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border-subtle">
          <div className="flex items-center justify-around h-16 px-1">
            {mobileNavItems.map((item) => {
              const active = item.kind === 'workspace'
                ? studyWorkspaceOpen
                : currentView === item.view;
              const key = item.kind === 'workspace' ? 'workspace' : item.view;
              return (
                <button
                  key={key}
                  type="button"
                  {...(item.kind === 'view' ? navButtonProps(item.view) : {
                    'data-testid': 'mobile-nav-workspace',
                    'data-tour': 'mobile-nav-workspace',
                  })}
                  onClick={() => {
                    if (item.kind === 'workspace') {
                      onOpenWorkspace?.();
                      return;
                    }
                    onNavigate(item.view);
                  }}
                  {...(item.kind === 'workspace' ? workspaceEntryPrefetchHandlers() : {})}
                  className={cn(
                    'flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all min-w-[52px] max-w-[72px]',
                    active ? 'platform-nav-mobile-active' : 'text-text-tertiary',
                    item.kind === 'workspace' && !active && 'text-brand-600',
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="type-micro font-medium truncate w-full text-center">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
