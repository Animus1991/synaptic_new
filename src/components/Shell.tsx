import { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckSquare, Robot as Bot, SquaresFour as LayoutDashboard, Gear as Settings,
  Sparkle as Sparkles, List as Menu, X, UploadSimple as Upload, Bell, MagnifyingGlass as Search, CaretRight as ChevronRight,
  ChartBar as BarChart3, Sun, Moon, Users, Fire as Flame, SquaresFour as Layout, Wind, GraduationCap,
  TreeStructure as Network, Lightning as Zap, Clock, Stack as Layers, DotsThreeOutline,
  CalendarBlank, Play,
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
import { filterNavigationRegistry } from '../lib/navCapabilities';
import {
  mobileOverflowNav,
  mobilePrimaryNav,
  type NavRegistryEntry,
  type ShellNavView,
} from '../lib/navigationRegistry';
import { PlatformSkipLinks } from './PlatformSkipLinks';
import { OfflineShellBanner } from './OfflineShellBanner';
import { DemoSandboxBanner } from './DemoSandboxBanner';
import { HeaderAccountAuth } from './HeaderAccountAuth';
import { HeaderLangPill, HeaderTrustBadgeRow, SynapseBrandGlyph } from './ui/platformChrome';
import type { Lang } from '../lib/i18n';
import { commandPaletteBadge } from '../lib/workspaceKeyboardShortcuts';
import { quickAccessActions, type GlobalQuickActionId } from '../lib/globalActionRegistry';

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
  breadcrumb?: { course?: string; lesson?: string; viewLabel?: string };
  workspaceLive?: WorkspaceLiveSync | null;
  onOpenWorkspace?: () => void;
  /** Start recommended study session (Tasks). Wave J-D05 shell CTA. */
  onStartSession?: () => void;
  studyWorkspaceOpen?: boolean;
  onTakeBreath?: () => void;
  activeCourse?: { title: string; mastery: number; daysToExam: number | null } | null;
  onContinueCourse?: () => void;
  onQuickAccess?: (action: GlobalQuickActionId) => void;
  hasCourses?: boolean;
  language?: Lang;
  onLanguageChange?: (lang: Lang) => void;
  onPatchSettings?: (partial: Partial<UserSettings>) => void;
}

type MobileBarItem =
  | { kind: 'view'; entry: NavRegistryEntry; icon: typeof BookOpen }
  | { kind: 'workspace'; icon: typeof Layout; labelKey: I18nKey }
  | { kind: 'more'; icon: typeof DotsThreeOutline; labelKey: I18nKey };

const SHELL_NAV_ICONS: Record<ShellNavView, typeof BookOpen> = {
  dashboard: LayoutDashboard,
  library: BookOpen,
  tasks: CheckSquare,
  agent: Bot,
  analytics: BarChart3,
  teacher: Users,
  'student-org': GraduationCap,
  settings: Settings,
};

function buildMobileBarItems(
  visible: NavRegistryEntry[],
  showWorkspace: boolean,
  hasOverflow: boolean,
): MobileBarItem[] {
  const items: MobileBarItem[] = mobilePrimaryNav(visible).map((entry) => ({
    kind: 'view' as const,
    entry,
    icon: SHELL_NAV_ICONS[entry.view],
  }));
  if (showWorkspace) {
    items.push({ kind: 'workspace', icon: Layout, labelKey: 'navStudyWorkspace' });
  }
  if (hasOverflow) {
    items.push({ kind: 'more', icon: DotsThreeOutline, labelKey: 'navMore' });
  }
  return items;
}

const shellNavClass = (active: boolean) =>
  cn(
    'platform-nav-item relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
    active
      ? 'platform-nav-active'
      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  );

function NavActiveIndicator() {
  return (
    <motion.div
      layoutId="synapseActiveNavIndicator"
      className="absolute inset-0 rounded-xl platform-nav-active pointer-events-none"
      initial={false}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      style={{ zIndex: 0 }}
    />
  );
}

const QUICK_ACCESS_ICONS: Record<GlobalQuickActionId, { icon: typeof Network; color: string }> = {
  'note-analysis': { icon: Network, color: '#818CF8' },
  upload: { icon: Sparkles, color: '#34D399' },
  workspace: { icon: BookOpen, color: '#60A5FA' },
  exam: { icon: Zap, color: '#F87171' },
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
  onStartSession,
  studyWorkspaceOpen = false,
  onTakeBreath,
  activeCourse = null,
  onContinueCourse,
  onQuickAccess,
  hasCourses = false,
  language,
  onLanguageChange,
  onPatchSettings,
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
  const navViews = filterNavigationRegistry(user);
  const mobileNavItems = buildMobileBarItems(
    navViews,
    showMobileWorkspaceNav,
    mobileOverflowNav(navViews).length > 0,
  );
  const quickActions = quickAccessActions(hasCourses);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const drawer = mobileDrawerRef.current;
    const focusable = drawer?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggleSidebar(false);
        (mobileMoreRef.current ?? mobileMenuRef.current)?.focus();
        return;
      }
      if (e.key !== 'Tab' || !drawer) return;
      const nodes = drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const list = Array.from(nodes).filter((el) => !el.hasAttribute('disabled'));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, onToggleSidebar]);

  const navButtonProps = (view: AppView) => ({
    'data-testid': `nav-${view}`,
    'data-tour': `nav-${view}`,
  });

  return (
    <div className="app-shell min-h-screen bg-surface-primary flex relative overflow-x-hidden">
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
            const NavIcon = SHELL_NAV_ICONS[item.view];
            const insertWorkspaceAfter = item.view === 'agent';
            return (
              <div key={item.view}>
                <button
                  {...navButtonProps(item.view)}
                  onClick={() => onNavigate(item.view)}
                  title={item.subtitleKey ? t(item.subtitleKey) : undefined}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen)}
                >
                  {currentView === item.view && !studyWorkspaceOpen && <NavActiveIndicator />}
                  <NavIcon className="w-5 h-5 shrink-0 relative z-[1]" />
                  <span className="flex-1 text-left min-w-0 relative z-[1]">
                    <span className="block truncate">{t(item.labelKey)}</span>
                    {item.subtitleKey && (
                      <span className="block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {t(item.subtitleKey)}
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
          {onQuickAccess && quickActions.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="type-micro font-semibold text-text-tertiary uppercase tracking-wider px-2">
                  {shellUx.quickAccessTitle}
                </p>
              </div>
              {quickActions.map((action) => {
                const visual = QUICK_ACCESS_ICONS[action.id];
                return (
                <button
                  key={action.id}
                  type="button"
                  data-testid={`quick-access-${action.id}`}
                  onClick={() => onQuickAccess(action.id)}
                  className={cn(shellNavClass(false), 'py-2')}
                >
                  <span className="ux-quick-icon" style={{ backgroundColor: `${visual.color}20` }}>
                    <visual.icon className="w-3 h-3" style={{ color: visual.color }} />
                  </span>
                  <span className="text-xs truncate">{t(action.labelKey)}</span>
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
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            data-testid="nav-profile-settings"
            className="w-full flex items-center gap-3 px-2 rounded-lg hover:bg-surface-hover transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full platform-brand-icon flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-text-tertiary">Level {user.level} · {user.xp} XP</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => onToggleSidebar(false)} aria-hidden="true" />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('navMobileMenuAria')}
            className="absolute inset-y-0 left-0 w-72 bg-surface-secondary border-r border-border-subtle flex flex-col"
            data-testid="nav-mobile-drawer"
          >
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg platform-brand-icon flex items-center justify-center">
                  <SynapseBrandGlyph />
                </div>
                <span className="text-xl font-bold ws-serif">Synapse</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleSidebar(false)}
                aria-label={t('close')}
                className="p-1.5 rounded-lg hover:bg-surface-hover"
              >
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
              {navViews.map((item) => {
                const NavIcon = SHELL_NAV_ICONS[item.view];
                return (
                <button
                  key={item.view}
                  {...navButtonProps(item.view)}
                  onClick={() => { onNavigate(item.view); onToggleSidebar(false); }}
                  title={item.subtitleKey ? t(item.subtitleKey) : undefined}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen)}
                >
                  <NavIcon className="w-5 h-5" />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">{t(item.labelKey)}</span>
                    {item.subtitleKey && (
                      <span className="block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {t(item.subtitleKey)}
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
              );})}
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
        {/* Top bar — Wave J-D05 dense utility chrome */}
        <header className="sticky top-0 z-20 glass-strong border-b border-border-subtle" data-testid="shell-topbar">
          <div className="flex items-center justify-between px-3 sm:px-5 h-12 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => onToggleSidebar(true)}
                ref={mobileMenuRef}
                className="lg:hidden p-1.5 rounded-lg hover:bg-surface-hover shrink-0"
                aria-label={t('openMenu')}
              >
                <Menu className="w-4 h-4 text-text-secondary" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-tertiary min-w-0" aria-current="page">
                {breadcrumb?.course ? (
                  <>
                    <span className="text-text-secondary font-medium truncate max-w-[160px]">{breadcrumb.course}</span>
                    {breadcrumb.lesson && (
                      <>
                        <span aria-hidden="true">›</span>
                        <span className="truncate max-w-[160px]">{breadcrumb.lesson}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-text-secondary font-medium truncate">
                    {breadcrumb?.viewLabel ?? currentView}
                  </span>
                )}
              </div>
              <HeaderTrustBadgeRow lang={activeLang} className="hidden 2xl:flex shrink-0" />
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Utility icon cluster (mockup: analytics + calendar) */}
              <div className="hidden md:flex items-center gap-0.5" data-testid="shell-utility-icons">
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  data-testid="shell-utility-analytics"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    currentView === 'analytics' ? 'bg-brand-500/15 text-brand-700' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                  aria-label={t('analytics')}
                  title={t('analytics')}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  data-testid="shell-utility-calendar"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    currentView === 'tasks' ? 'bg-brand-500/15 text-brand-700' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                  aria-label={t('tasks')}
                  title={t('tasks')}
                >
                  <CalendarBlank className="w-4 h-4" />
                </button>
              </div>

              {onLanguageChange && (
                <HeaderLangPill
                  lang={activeLang}
                  onChange={onLanguageChange}
                  className="hidden lg:inline-flex scale-95 origin-right"
                />
              )}
              {onTakeBreath && (
                <button
                  type="button"
                  onClick={onTakeBreath}
                  data-testid="header-take-breath"
                  className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                  aria-label={t('wellnessTakeBreath')}
                  title={t('wellnessBreathTitle')}
                >
                  <Wind className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onOpenSearch}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-input border border-border-subtle text-xs text-text-tertiary hover:border-brand-500/30 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{t('search')}</span>
                <kbd
                  className="text-[10px] bg-surface-hover px-1 py-0.5 rounded border border-border-subtle font-mono"
                  data-testid="shell-search-shortcut"
                >
                  {commandPaletteBadge()}
                </kbd>
              </button>

              <button
                onClick={onOpenNotifications}
                data-testid="shell-notifications-bell"
                data-unread-count={notificationCount > 0 ? String(notificationCount) : '0'}
                className="relative p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                aria-label={
                  notificationCount > 0
                    ? `${t('notifications')} (${notificationCount})`
                    : t('notifications')
                }
              >
                <Bell className="w-4 h-4 text-text-secondary" />
                {notificationCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[7px] h-1.5 px-0.5 bg-accent-rose rounded-full"
                    aria-hidden="true"
                  />
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
                    className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                    title={t(labelKey)}
                    aria-label={t(labelKey)}
                  >
                    {target === 'light' ? (
                      <Sun className="w-4 h-4 text-text-secondary" />
                    ) : target === 'spectrum' ? (
                      <Sparkles className="w-4 h-4 text-text-secondary" />
                    ) : target === 'blueprint' ? (
                      <Layers className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <Moon className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                );
              })()}

              {onOpenWorkspace && (
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  data-testid="shell-study-workspace"
                  {...workspaceEntryPrefetchHandlers()}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-500/35 text-[11px] font-medium text-brand-800 hover:bg-brand-600/10 transition-colors whitespace-nowrap"
                >
                  <Layout className="w-3.5 h-3.5" />
                  {t('navStudyWorkspace')}
                </button>
              )}
              {onStartSession && (
                <button
                  type="button"
                  onClick={onStartSession}
                  data-testid="shell-start-session"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-700 text-[11px] font-semibold text-white hover:bg-brand-800 transition-colors whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5" weight="fill" />
                  {t('startSession')}
                </button>
              )}

              {onPatchSettings && (
                <HeaderAccountAuth
                  settings={user.settings}
                  onPatchSettings={onPatchSettings}
                />
              )}

              <button
                type="button"
                onClick={() => onNavigate('settings')}
                data-testid="header-profile-settings"
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div className="w-6 h-6 rounded-full platform-brand-icon flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:flex items-center gap-0.5">
                  <span className="text-[11px] font-medium text-accent-amber inline-flex items-center gap-0.5">
                    <Flame className="w-3 h-3" weight="fill" />
                    {stats.streak}
                  </span>
                  <ChevronRight className="w-3 h-3 text-text-tertiary" />
                </div>
              </button>
            </div>
          </div>
        </header>
        <OfflineShellBanner />
        <DemoSandboxBanner />


        {/* Page content */}
        <main id="platform-main" data-testid="platform-main" tabIndex={-1} className="flex-1 min-w-0 outline-none">
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
                : item.kind === 'view'
                  ? currentView === item.entry.view
                  : sidebarOpen;
              const key = item.kind === 'workspace'
                ? 'workspace'
                : item.kind === 'more'
                  ? 'more'
                  : item.entry.view;
              const Icon = item.kind === 'view' ? item.icon : item.icon;
              return (
                <button
                  key={key}
                  type="button"
                  ref={item.kind === 'more' ? mobileMoreRef : undefined}
                  {...(item.kind === 'view' ? {
                    'data-testid': `nav-mobile-${item.entry.view}`,
                    'data-tour': `nav-${item.entry.view}`,
                  } : item.kind === 'workspace' ? {
                    'data-testid': 'nav-mobile-workspace',
                    'data-tour': 'mobile-nav-workspace',
                  } : {
                    'data-testid': 'nav-mobile-more',
                    'data-tour': 'nav-more',
                  })}
                  onClick={() => {
                    if (item.kind === 'workspace') {
                      onOpenWorkspace?.();
                      return;
                    }
                    if (item.kind === 'more') {
                      onToggleSidebar(true);
                      return;
                    }
                    onNavigate(item.entry.view);
                  }}
                  {...(item.kind === 'workspace' ? workspaceEntryPrefetchHandlers() : {})}
                  className={cn(
                    'platform-nav-mobile-item relative flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all min-w-[52px] max-w-[72px]',
                    active ? 'platform-nav-mobile-active' : 'text-text-tertiary',
                    item.kind === 'workspace' && !active && 'text-brand-600',
                  )}
                  title={item.kind === 'workspace' ? t('shellMobileWorkspaceHint') : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="type-micro font-medium truncate w-full text-center">
                    {item.kind === 'view' ? t(item.entry.labelKey) : t(item.labelKey)}
                  </span>
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
