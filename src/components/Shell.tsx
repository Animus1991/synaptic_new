import { ReactNode } from 'react';
import {
  BookOpen, CheckSquare, Robot as Bot, SquaresFour as LayoutDashboard, Gear as Settings,
  Sparkle as Sparkles, List as Menu, X, UploadSimple as Upload, Bell, MagnifyingGlass as Search, CaretRight as ChevronRight,
  ChartBar as BarChart3, Sun, Moon, Users,   Fire as Flame, SquaresFour as Layout, Wind, GraduationCap,
  TreeStructure as Network, Lightning as Zap, Clock, Stack as Layers,
} from '@phosphor-icons/react';
import type { AppView, User, DashboardStats, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { useI18n, type I18nKey } from '../lib/i18n';
import { getTasksContent } from '../lib/tasksContent';
import { getShellUxContent } from '../lib/shellUxContent';
import { resolveTheme, themeToggleTarget } from '../lib/theme';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { workspaceLiveIsStale } from '../lib/workspaceStoreSpine';
import { workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { PlatformSkipLinks } from './PlatformSkipLinks';
import { OfflineShellBanner } from './OfflineShellBanner';
import { HeaderLangPill, HeaderTrustBadgeRow, SynapseBrandGlyph } from './ui/platformChrome';
import type { Lang } from '../lib/i18n';
import { commandPaletteBadge } from '../lib/workspaceKeyboardShortcuts';
import { showStandaloneAgentNav } from '../lib/platformFocus';

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
  onTakeBreath?: () => void;
  activeCourse?: { title: string; mastery: number; daysToExam: number | null } | null;
  onContinueCourse?: () => void;
  onQuickAccess?: (action: 'note-analysis' | 'upload' | 'workspace' | 'exam') => void;
  hasCourses?: boolean;
  language?: Lang;
  onLanguageChange?: (lang: Lang) => void;
}

type MobileNavItem =
  | { kind: 'view'; view: AppView; icon: typeof BookOpen; labelKey: I18nKey }
  | { kind: 'workspace'; icon: typeof Layout; labelKey: I18nKey };

const navViewsAll: { view: AppView; icon: typeof BookOpen; labelKey: I18nKey }[] = [
  { view: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { view: 'library', icon: BookOpen, labelKey: 'library' },
  { view: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { view: 'agent', icon: Bot, labelKey: 'agent' },
  { view: 'analytics', icon: BarChart3, labelKey: 'analytics' },
  { view: 'teacher', icon: Users, labelKey: 'teacher' },
  { view: 'student-org', icon: GraduationCap, labelKey: 'studentOrg' },
  { view: 'settings', icon: Settings, labelKey: 'settings' },
];

function visibleNavViews() {
  return navViewsAll.filter((item) => item.view !== 'agent' || showStandaloneAgentNav());
}

function buildMobileNavItems(showWorkspace: boolean): MobileNavItem[] {
  const navViews = visibleNavViews();
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
    'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
    active
      ? 'platform-nav-active'
      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  );

const QUICK_ACCESS: { id: 'note-analysis' | 'upload' | 'workspace' | 'exam'; icon: typeof Network; color: string }[] = [
  { id: 'note-analysis', icon: Network, color: '#818CF8' },
  { id: 'upload', icon: Sparkles, color: '#34D399' },
  { id: 'workspace', icon: BookOpen, color: '#60A5FA' },
  { id: 'exam', icon: Zap, color: '#F87171' },
];

const NAV_SUBTITLES: Partial<Record<AppView, I18nKey>> = {
  dashboard: 'navSubtitleDashboard',
  library: 'navSubtitleLibrary',
  tasks: 'navSubtitleTasks',
  agent: 'navSubtitleAgent',
  analytics: 'navSubtitleAnalytics',
  teacher: 'navSubtitleTeacher',
  'student-org': 'navSubtitleStudentOrg',
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
  onTakeBreath,
  activeCourse = null,
  onContinueCourse,
  onQuickAccess,
  hasCourses = false,
  language,
  onLanguageChange,
}: ShellProps) {
  const { t, lang } = useI18n();
  const activeLang = language ?? lang;
  const shellUx = getShellUxContent(lang);
  const tasksReviewBadgeHint = getTasksContent(lang).reviewsDue(stats.reviewsDue);
  const showMobileWorkspaceNav = Boolean(
    workspaceLive && !workspaceLiveIsStale(workspaceLive) && onOpenWorkspace,
  );
  const showDesktopWorkspaceNav = Boolean(
    onOpenWorkspace && (studyWorkspaceOpen || showMobileWorkspaceNav),
  );
  const mobileNavItems = buildMobileNavItems(showMobileWorkspaceNav);
  const navViews = visibleNavViews();

  const navButtonProps = (view: AppView) => ({
    'data-testid': `nav-${view}`,
    'data-tour': `nav-${view}`,
  });

  return (
    <div className="min-h-screen bg-surface-primary flex relative overflow-x-hidden">
      <div className="platform-blueprint-orbs" aria-hidden="true">
        <div className="platform-blueprint-orb platform-blueprint-orb-cyan" />
        <div className="platform-blueprint-orb platform-blueprint-orb-violet" />
      </div>
      <PlatformSkipLinks />
      {/* Desktop Sidebar */}
      <aside
        id="platform-sidebar-nav"
        tabIndex={-1}
        className="hidden lg:flex flex-col w-64 border-r border-border-subtle bg-surface-secondary/50 fixed inset-y-0 left-0 z-30"
      >
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg platform-brand-icon flex items-center justify-center">
              <SynapseBrandGlyph />
            </div>
            <span className="text-xl font-bold ws-serif">Synapse</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {onTakeBreath && (
            <button
              type="button"
              onClick={onTakeBreath}
              data-testid="nav-take-breath"
              className={cn(shellNavClass(false), 'mb-1')}
            >
              <Wind className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left truncate">{t('wellnessTakeBreath')}</span>
            </button>
          )}
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
                  <span className="flex-1 text-left min-w-0">
                    <span className="block truncate">{t(item.labelKey)}</span>
                    {NAV_SUBTITLES[item.view] && (
                      <span className="block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {t(NAV_SUBTITLES[item.view]!)}
                      </span>
                    )}
                  </span>
                  {item.view === 'tasks' && stats.reviewsDue > 0 && (
                    <span
                      title={tasksReviewBadgeHint}
                      className="ml-auto text-xs ws-chip-danger px-2 py-0.5 rounded-full font-semibold"
                    >
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
                    <span className="flex-1 text-left min-w-0">
                      <span className="block truncate" title={t('navStudyWorkspace')}>{t('navStudyWorkspace')}</span>
                      <span className="block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {t('navSubtitleWorkspace')}
                      </span>
                    </span>
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
          {onQuickAccess && hasCourses && (
            <>
              <div className="pt-4 pb-2">
                <p className="type-micro font-semibold text-text-tertiary uppercase tracking-wider px-2">
                  {shellUx.quickAccessTitle}
                </p>
              </div>
              {QUICK_ACCESS.map((item) => {
                const quickLabel = item.id === 'note-analysis'
                  ? shellUx.quickNoteAnalysis
                  : item.id === 'upload'
                    ? shellUx.quickUpload
                    : item.id === 'workspace'
                      ? shellUx.quickWorkspace
                      : shellUx.quickExam;
                return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`quick-access-${item.id}`}
                  onClick={() => onQuickAccess(item.id)}
                  className={cn(shellNavClass(false), 'py-2')}
                >
                  <span className="ux-quick-icon" style={{ backgroundColor: `${item.color}20` }}>
                    <item.icon className="w-3 h-3" style={{ color: item.color }} />
                  </span>
                  <span className="text-xs truncate">{quickLabel}</span>
                </button>
              );})}
            </>
          )}
          {activeCourse && onContinueCourse && (
            <div className="mt-4 mx-1 p-3 rounded-xl border border-border-subtle bg-surface-hover/60" data-testid="active-course-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-brand-600/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3 h-3 text-brand-400" />
                </div>
                <p className="text-xs font-medium text-text-primary leading-tight truncate">{activeCourse.title}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  {activeCourse.daysToExam === null
                    ? shellUx.noExamDate
                    : activeCourse.daysToExam === 0
                      ? shellUx.examToday
                      : shellUx.daysToExam(activeCourse.daysToExam)}
                </span>
              </div>
              <div className="ux-progress-track">
                <div className="ux-progress-fill" style={{ width: `${Math.min(100, activeCourse.mastery)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-text-tertiary">{shellUx.percentComplete(Math.round(activeCourse.mastery))}</span>
                <button
                  type="button"
                  onClick={onContinueCourse}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  {shellUx.continueCourse}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
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
                  <SynapseBrandGlyph />
                </div>
                <span className="text-xl font-bold ws-serif">Synapse</span>
              </div>
              <button onClick={() => onToggleSidebar(false)} className="p-1.5 rounded-lg hover:bg-surface-hover">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {onTakeBreath && (
                <button
                  type="button"
                  onClick={() => { onTakeBreath(); onToggleSidebar(false); }}
                  data-testid="nav-mobile-take-breath"
                  className={cn(shellNavClass(false), 'mb-1')}
                >
                  <Wind className="w-5 h-5" />
                  {t('wellnessTakeBreath')}
                </button>
              )}
              {navViews.map((item) => (
                <button
                  key={item.view}
                  {...navButtonProps(item.view)}
                  onClick={() => onNavigate(item.view)}
                  title={NAV_SUBTITLES[item.view] ? t(NAV_SUBTITLES[item.view]!) : undefined}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">{t(item.labelKey)}</span>
                    {NAV_SUBTITLES[item.view] && (
                      <span className="block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {t(NAV_SUBTITLES[item.view]!)}
                      </span>
                    )}
                  </span>
                  {item.view === 'tasks' && stats.reviewsDue > 0 && (
                    <span
                      title={tasksReviewBadgeHint}
                      className="ml-auto text-xs ws-chip-danger px-2 py-0.5 rounded-full font-semibold"
                    >
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
          <div className="flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => onToggleSidebar(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-surface-hover shrink-0"
                aria-label={t('openMenu')}
              >
                <Menu className="w-5 h-5 text-text-secondary" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-text-tertiary min-w-0">
                {breadcrumb?.course ? (
                  <>
                    <span className="text-text-secondary font-medium">{breadcrumb.course}</span>
                    {breadcrumb.lesson && (
                      <>
                        <span aria-hidden="true">›</span>
                        <span className="truncate max-w-[200px]">{breadcrumb.lesson}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-text-secondary font-medium capitalize">{currentView}</span>
                )}
              </div>
              <HeaderTrustBadgeRow lang={activeLang} className="hidden xl:flex shrink-0" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onLanguageChange && (
                <HeaderLangPill
                  lang={activeLang}
                  onChange={onLanguageChange}
                  className="hidden sm:inline-flex"
                />
              )}
              {onTakeBreath && (
                <>
                  <button
                    type="button"
                    onClick={onTakeBreath}
                    data-testid="header-take-breath"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:border-brand-500/30 hover:text-brand-800 transition-colors"
                    title={t('wellnessBreathTitle')}
                  >
                    <Wind className="w-4 h-4" />
                    {t('wellnessTakeBreath')}
                  </button>
                  <button
                    type="button"
                    onClick={onTakeBreath}
                    data-testid="header-take-breath-mobile"
                    className="sm:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    aria-label={t('wellnessTakeBreath')}
                    title={t('wellnessBreathTitle')}
                  >
                    <Wind className="w-5 h-5 text-text-secondary" />
                  </button>
                </>
              )}
              <button
                onClick={onOpenSearch}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-input border border-border-subtle text-sm text-text-tertiary hover:border-brand-500/30 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{t('search')}</span>
                <kbd
                  className="text-xs bg-surface-hover px-1.5 py-0.5 rounded border border-border-subtle ml-4 font-mono"
                  data-testid="shell-search-shortcut"
                >
                  {commandPaletteBadge()}
                </kbd>
              </button>

              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors"
                aria-label={t('notifications')}
              >
                <Bell className="w-5 h-5 text-text-secondary" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-rose rounded-full" />
                )}
              </button>

              {onToggleTheme && (() => {
                const resolved = resolveTheme(theme ?? 'dark');
                const target = themeToggleTarget(resolved);
                const labelKey: I18nKey =
                  target === 'light'
                    ? 'switchLight'
                    : target === 'spectrum'
                      ? 'switchSpectrum'
                      : target === 'blueprint'
                        ? 'switchBlueprint'
                        : 'switchDark';
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
                    ) : target === 'blueprint' ? (
                      <Layers className="w-5 h-5 text-text-secondary" />
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
        <OfflineShellBanner />


        {/* Page content */}
        <main id="platform-main" data-testid="platform-main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          id="platform-mobile-nav"
          data-testid="platform-mobile-nav"
          tabIndex={-1}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border-subtle outline-none"
        >
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
                  {...(item.kind === 'view' ? {
                    'data-testid': `nav-mobile-${item.view}`,
                    'data-tour': `nav-${item.view}`,
                  } : {
                    'data-testid': 'nav-mobile-workspace',
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
                  title={item.kind === 'workspace' ? t('shellMobileWorkspaceHint') : undefined}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="type-micro font-medium truncate w-full text-center">{t(item.labelKey)}</span>
                  {item.kind === 'workspace' && (
                    <span className="type-micro text-[9px] text-text-tertiary truncate w-full text-center">
                      {t('shellMobileWorkspaceHint')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
