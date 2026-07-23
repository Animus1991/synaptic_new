import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckSquare, Robot as Bot, SquaresFour as LayoutDashboard, Gear as Settings,
  Sparkle as Sparkles, List as Menu, X, UploadSimple as Upload, Bell, MagnifyingGlass as Search, CaretRight as ChevronRight,
  CaretLeft as ChevronLeft, CaretDoubleRight, ChartBar as BarChart3, Sun, Moon, Users, Fire as Flame, SquaresFour as Layout, Wind, GraduationCap,
  TreeStructure as Network, Lightning as Zap, Clock, Stack as Layers, DotsThreeOutline, Minus, Square,
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
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { loadShellRailCollapsed, persistShellRailCollapsed } from '../lib/shellRailCollapsed';
import { groupShellNavEntries, type ShellNavGroupId } from '../lib/shellNavGroups';
import { asAllCapsLabel } from '../lib/greekTypography';
import { AllCapsLabel } from './ui/AllCapsLabel';

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

const shellNavClass = (active: boolean, quiet = false, iconRail = false) =>
  cn(
    'platform-nav-item relative w-full flex text-sm font-medium transition-all border',
    quiet ? 'rounded-md' : 'rounded-xl',
    iconRail ? 'items-center justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2.5',
    !iconRail && (quiet ? 'items-center' : 'items-start'),
    active
      ? 'platform-nav-active'
      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  );

function NavActiveIndicator({ quiet = false }: { quiet?: boolean }) {
  return (
    <motion.div
      layoutId="synapseActiveNavIndicator"
      className={cn(
        'absolute inset-0 platform-nav-active pointer-events-none',
        quiet ? 'rounded-md' : 'rounded-xl',
      )}
      initial={false}
      // OPT-R17 — Minimal: short tween instead of spring float feel.
      transition={
        quiet
          ? { type: 'tween', duration: 0.16, ease: [0, 0, 0.2, 1] }
          : { type: 'spring', stiffness: 400, damping: 32 }
      }
      style={{ zIndex: 0 }}
    />
  );
}

const QUICK_ACCESS_ICONS: Record<GlobalQuickActionId, { icon: typeof Network; inkClass: string; washClass: string }> = {
  'note-analysis': { icon: Network, inkClass: 'text-accent-violet', washClass: 'bg-accent-violet/15' },
  upload: { icon: Sparkles, inkClass: 'text-accent-emerald', washClass: 'bg-accent-emerald/15' },
  workspace: { icon: BookOpen, inkClass: 'text-brand-600', washClass: 'bg-brand-500/15' },
  exam: { icon: Zap, inkClass: 'text-accent-rose', washClass: 'bg-accent-rose/15' },
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
  /** OPT-C3 — ChatGPT-calm: single-line nav under Minimal; subtitles stay in title tooltips. */
  const quietNav = useMinimalTheme();
  /** OPT-R9 — optional icon-collapsed desktop rail (all themes; Minimal still defaults compact). */
  const [railCollapsed, setRailCollapsed] = useState(() => loadShellRailCollapsed(quietNav));
  /** OPT-K10 — secondary chrome (trust badges + study space) in overflow under Minimal. */
  const [chromeMoreOpen, setChromeMoreOpen] = useState(false);
  const chromeMoreRef = useRef<HTMLDivElement>(null);
  const iconRail = railCollapsed;
  const toggleRailCollapsed = useCallback(() => {
    setRailCollapsed((prev) => {
      const next = !prev;
      persistShellRailCollapsed(next);
      return next;
    });
  }, []);
  const shellUx = getShellUxContent(lang);
  const tasksReviewBadgeHint = getTasksContent(lang).reviewsDue(stats.reviewsDue);
  const showMobileWorkspaceNav = Boolean(
    workspaceLive && !workspaceLiveIsStale(workspaceLive) && onOpenWorkspace,
  );
  const showDesktopWorkspaceNav = Boolean(
    onOpenWorkspace && (studyWorkspaceOpen || showMobileWorkspaceNav),
  );
  const navViews = filterNavigationRegistry(user);
  /** OPT-K1 — Cursor-like section groups under Minimal (flat list on Blueprint). */
  const navGroups = useMemo(
    () => (quietNav ? groupShellNavEntries(navViews) : [{ id: 'study' as ShellNavGroupId, entries: navViews }]),
    [quietNav, navViews],
  );
  const showNavGroupLabels = quietNav && !iconRail;
  const navGroupLabel = (id: ShellNavGroupId) => {
    const raw =
      id === 'insights'
        ? shellUx.navGroupInsights
        : id === 'organization'
          ? shellUx.navGroupOrganization
          : id === 'account'
            ? shellUx.navGroupAccount
            : shellUx.navGroupStudy;
    return asAllCapsLabel(raw);
  };
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
    if (!chromeMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!chromeMoreRef.current?.contains(e.target as Node)) setChromeMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [chromeMoreOpen]);

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
        data-quiet-nav={quietNav ? 'true' : undefined}
        data-rail-collapsed={iconRail ? 'true' : undefined}
        className={cn(
          'hidden lg:flex flex-col border-r border-border-subtle bg-surface-secondary/50 fixed inset-y-0 left-0 z-30',
          iconRail ? 'w-14 shell-rail-collapsed' : quietNav ? 'w-56' : 'w-64',
        )}
      >
        <div className={cn('border-b border-border-subtle', iconRail ? 'p-2 space-y-1.5' : 'p-4')}>
          <div className={cn('flex items-center', iconRail ? 'justify-center' : 'gap-2')}>
            <div className="w-8 h-8 rounded-lg platform-brand-icon flex items-center justify-center shrink-0" title="Synapse">
              <SynapseBrandGlyph />
            </div>
            {!iconRail && <span className="text-lg font-bold ws-serif">Synapse</span>}
          </div>
          {/* OPT-K13 — expand control near brand when compact (foot toggle alone was easy to miss). */}
          {iconRail && (
            <button
              type="button"
              onClick={toggleRailCollapsed}
              data-testid="shell-rail-expand-top"
              aria-label={t('shellRailExpandAria')}
              title={t('shellRailExpandHint')}
              className="shell-rail-expand-affordance w-full flex items-center justify-center rounded-lg border border-border-subtle p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <CaretDoubleRight className="w-4 h-4" weight="bold" aria-hidden />
              <span className="sr-only">{t('shellRailExpand')}</span>
            </button>
          )}
        </div>

        <nav className={cn('flex-1 space-y-1', iconRail ? 'p-1.5' : 'p-3')}>
          {onTakeBreath && (
            <button
              type="button"
              onClick={onTakeBreath}
              data-testid="nav-take-breath"
              title={t('wellnessTakeBreath')}
              aria-label={t('wellnessTakeBreath')}
              className={cn(shellNavClass(false, quietNav, iconRail), 'mb-1')}
            >
              <Wind className="w-5 h-5 shrink-0" />
              <span className={cn(iconRail ? 'sr-only' : 'flex-1 text-left truncate')}>{t('wellnessTakeBreath')}</span>
            </button>
          )}
          {navGroups.map((group) => (
            <div key={group.id} className="shell-nav-group" data-nav-group={group.id}>
              {showNavGroupLabels && (
                <p className="shell-nav-group-label" aria-hidden>
                  {navGroupLabel(group.id)}
                </p>
              )}
              {group.entries.map((item) => {
                const NavIcon = SHELL_NAV_ICONS[item.view];
                const insertWorkspaceAfter = item.view === 'agent';
                const label = t(item.labelKey);
                const subtitle = item.subtitleKey ? t(item.subtitleKey) : undefined;
                const tip = subtitle ? `${label} — ${subtitle}` : label;
                return (
                  <div key={item.view}>
                    <button
                      {...navButtonProps(item.view)}
                      onClick={() => onNavigate(item.view)}
                      title={tip}
                      aria-label={tip}
                      className={shellNavClass(currentView === item.view && !studyWorkspaceOpen, quietNav, iconRail)}
                    >
                      {currentView === item.view && !studyWorkspaceOpen && (
                        <NavActiveIndicator quiet={quietNav} />
                      )}
                      <NavIcon className="w-5 h-5 shrink-0 relative z-[1]" />
                      <span className={cn(iconRail ? 'sr-only' : 'flex-1 text-left min-w-0 relative z-[1]')}>
                        <span className="block truncate">{label}</span>
                        {subtitle && !quietNav && !iconRail && (
                          <span className="platform-nav-subtitle block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                            {subtitle}
                          </span>
                        )}
                      </span>
                      {item.view === 'tasks' && stats.reviewsDue > 0 && (
                        <span
                          title={tasksReviewBadgeHint}
                          className={cn(
                            'text-xs ws-chip-danger font-semibold',
                            iconRail
                              ? 'absolute -right-0.5 -top-0.5 z-[2] min-w-[1rem] rounded-full px-1 py-0 text-[10px] leading-tight'
                              : 'ml-auto px-2 py-0.5 rounded-full',
                          )}
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
                        title={`${t('navStudyWorkspace')} — ${t('navSubtitleWorkspace')}`}
                        aria-label={`${t('navStudyWorkspace')} — ${t('navSubtitleWorkspace')}`}
                        className={cn(shellNavClass(studyWorkspaceOpen, quietNav, iconRail), 'mt-1')}
                      >
                        <Layout className="w-5 h-5 shrink-0" />
                        <span className={cn(iconRail ? 'sr-only' : 'flex-1 text-left min-w-0')}>
                          <span className="block truncate">{t('navStudyWorkspace')}</span>
                          {!quietNav && !iconRail && (
                            <span className="platform-nav-subtitle block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                              {t('navSubtitleWorkspace')}
                            </span>
                          )}
                        </span>
                        {!iconRail && (studyWorkspaceOpen ? (
                          <span className="ml-auto type-micro ws-chip-brand px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                            {t('navContinuingHere')}
                          </span>
                        ) : workspaceLive?.snapshot.toolLabel ? (
                          <span className="ml-auto type-micro ws-chip-neutral px-2 py-0.5 rounded-full font-semibold truncate max-w-[5.5rem]">
                            {workspaceLive.snapshot.toolLabel}
                          </span>
                        ) : null)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {onQuickAccess && quickActions.length > 0 && (
            <>
              {!iconRail && (
                <div className="pt-4 pb-2">
                  <p className="type-micro font-semibold text-text-tertiary uppercase tracking-wider px-2">
                    <AllCapsLabel>{shellUx.quickAccessTitle}</AllCapsLabel>
                  </p>
                </div>
              )}
              {quickActions.map((action) => {
                const visual = QUICK_ACCESS_ICONS[action.id];
                const actionLabel = t(action.labelKey);
                return (
                <button
                  key={action.id}
                  type="button"
                  data-testid={`quick-access-${action.id}`}
                  onClick={() => onQuickAccess(action.id)}
                  title={actionLabel}
                  aria-label={actionLabel}
                  className={cn(shellNavClass(false, quietNav, iconRail), 'py-2')}
                >
                  <span className={cn('ux-quick-icon', quietNav ? 'bg-surface-secondary' : visual.washClass)}>
                    <visual.icon className={cn('w-3 h-3', quietNav ? 'text-text-secondary' : visual.inkClass)} />
                  </span>
                  <span className={cn(iconRail ? 'sr-only' : 'text-xs truncate')}>{actionLabel}</span>
                </button>
              );})}
            </>
          )}
          {activeCourse && onContinueCourse && (
            iconRail ? (
              <button
                type="button"
                onClick={onContinueCourse}
                data-testid="active-course-card"
                title={`${activeCourse.title} — ${shellUx.continueCourse}`}
                aria-label={`${activeCourse.title} — ${shellUx.continueCourse}`}
                className={cn(shellNavClass(false, quietNav, true), 'mt-2')}
              >
                <BookOpen className="w-5 h-5 shrink-0 text-brand-400" />
                <span className="sr-only">{activeCourse.title}</span>
              </button>
            ) : (
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
            )
          )}
        </nav>

        <div className={cn(iconRail ? 'p-1.5' : 'p-3')}>
          <button
            type="button"
            onClick={onUpload}
            title={t('uploadMaterial')}
            aria-label={t('uploadMaterial')}
            className={cn(
              'w-full flex items-center rounded-xl ws-fab font-medium text-sm transition-all',
              iconRail ? 'justify-center px-2 py-2.5' : 'gap-2 px-4 py-3',
            )}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className={iconRail ? 'sr-only' : undefined}>{t('uploadMaterial')}</span>
          </button>
        </div>

        <div className={cn('border-t border-border-subtle', iconRail ? 'p-1.5' : 'px-3 py-2')}>
          <button
            type="button"
            onClick={toggleRailCollapsed}
            data-testid="shell-rail-collapse-toggle"
            aria-pressed={iconRail}
            aria-label={iconRail ? t('shellRailExpandAria') : t('shellRailCollapseAria')}
            title={iconRail ? t('shellRailExpandHint') : t('shellRailCollapseHint')}
            className={cn(
              'shell-rail-expand-affordance w-full flex items-center rounded-lg border text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary',
              iconRail
                ? 'justify-center border-border-default bg-surface-secondary/80 p-2'
                : 'gap-2 border-border-subtle px-3 py-2 text-xs font-medium',
            )}
          >
            {iconRail ? (
              <CaretDoubleRight className="w-4 h-4" weight="bold" aria-hidden />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden />
            )}
            {!iconRail && <span>{t('shellRailCollapse')}</span>}
            {iconRail && <span className="sr-only">{t('shellRailExpand')}</span>}
          </button>
        </div>

        <div className={cn('border-t border-border-subtle', iconRail ? 'p-1.5' : 'p-3')}>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            data-testid="nav-profile-settings"
            title={`${user.name} · Level ${user.level}`}
            aria-label={`${user.name} · Level ${user.level}`}
            className={cn(
              'w-full flex items-center rounded-lg hover:bg-surface-hover transition-colors',
              iconRail ? 'justify-center p-1.5' : 'gap-3 px-2 text-left',
            )}
          >
            <div className="w-9 h-9 rounded-full platform-brand-icon flex items-center justify-center text-sm font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            {!iconRail && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-text-tertiary">Level {user.level} · {user.xp} XP</p>
              </div>
            )}
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
                <span className="text-lg font-bold ws-serif">Synapse</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleSidebar(false)}
                aria-label={t('close')}
                className="p-2.5 min-w-10 min-h-10 rounded-lg hover:bg-surface-hover inline-flex items-center justify-center"
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
                  className={cn(shellNavClass(false, quietNav), 'mb-1')}
                >
                  <Wind className="w-5 h-5" />
                  {t('wellnessTakeBreath')}
                </button>
              )}
              {navViews.map((item) => {
                const NavIcon = SHELL_NAV_ICONS[item.view];
                const label = t(item.labelKey);
                const subtitle = item.subtitleKey ? t(item.subtitleKey) : undefined;
                return (
                <button
                  key={item.view}
                  {...navButtonProps(item.view)}
                  onClick={() => { onNavigate(item.view); onToggleSidebar(false); }}
                  title={subtitle ? `${label} — ${subtitle}` : label}
                  className={shellNavClass(currentView === item.view && !studyWorkspaceOpen, quietNav)}
                >
                  <NavIcon className="w-5 h-5" />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">{label}</span>
                    {subtitle && !quietNav && (
                      <span className="platform-nav-subtitle block text-[11px] font-normal text-text-tertiary truncate mt-0.5">
                        {subtitle}
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
      <div
        className={cn('flex-1 min-h-screen flex flex-col', iconRail ? 'lg:ml-14' : quietNav ? 'lg:ml-56' : 'lg:ml-64')}
        data-testid="shell-main-offset"
        data-rail-state={iconRail ? 'compact' : quietNav ? 'expanded' : 'blueprint-expanded'}
      >
        {/* Top bar — Wave J-D05 dense utility chrome */}
        <header
          className={cn(
            'sticky top-0 z-20 glass-strong border-b border-border-subtle',
            quietNav && 'shell-topbar-calm',
          )}
          data-testid="shell-topbar"
          data-chrome-calm={quietNav ? 'true' : undefined}
        >
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
              {/* OPT-K10 — trust badges live in chrome overflow under Minimal (still reachable). */}
              {!quietNav && (
                <HeaderTrustBadgeRow lang={activeLang} className="hidden 2xl:flex shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Utility icon cluster — kept under Minimal (quiet icons, not competing CTAs) */}
              <div className="hidden md:flex items-center gap-0.5" data-testid="shell-utility-icons">
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  data-testid="shell-utility-analytics"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    currentView === 'analytics'
                      ? quietNav
                        ? 'bg-surface-secondary text-text-primary'
                        : 'bg-brand-500/15 text-brand-700'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
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
                    currentView === 'tasks'
                      ? quietNav
                        ? 'bg-surface-secondary text-text-primary'
                        : 'bg-brand-500/15 text-brand-700'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
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
                type="button"
                onClick={onOpenSearch}
                data-testid="shell-search-button"
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-input border border-border-subtle text-xs text-text-tertiary hover:border-border-default transition-colors"
                title={t('shellSearchTitle').replace('{shortcut}', commandPaletteBadge())}
                aria-label={t('shellSearchTitle').replace('{shortcut}', commandPaletteBadge())}
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
                        : target === 'minimal'
                          ? 'switchMinimal'
                          : target === 'minimal-dark'
                            ? 'switchMinimalDark'
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
                    ) : target === 'minimal' ? (
                      <Minus className="w-4 h-4 text-text-secondary" />
                    ) : target === 'minimal-dark' ? (
                      <Square className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <Moon className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                );
              })()}

              {/* OPT-K10/K23 — solid primary CTA; Minimal light = cyan via CSS */}
              {onStartSession && (
                <button
                  type="button"
                  onClick={onStartSession}
                  data-testid="shell-start-session"
                  className={cn(
                    'hidden sm:inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold leading-none transition-colors whitespace-nowrap',
                    quietNav
                      ? 'shell-start-session ux-primary-cta'
                      : 'bg-brand-700 text-white hover:bg-brand-800',
                  )}
                >
                  <Play className="w-3.5 h-3.5 shrink-0" weight="fill" />
                  {t('startSession')}
                </button>
              )}

              {onPatchSettings && (
                <HeaderAccountAuth
                  settings={user.settings}
                  onPatchSettings={onPatchSettings}
                  quiet={quietNav}
                />
              )}

              {/* OPT-K10 — overflow: study space + trust badges (all still reachable) */}
              {quietNav && (
                <div className="relative hidden md:block" ref={chromeMoreRef}>
                  <button
                    type="button"
                    data-testid="shell-chrome-more"
                    aria-expanded={chromeMoreOpen}
                    aria-haspopup="menu"
                    aria-label={t('shellChromeMore')}
                    onClick={() => setChromeMoreOpen((v) => !v)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                  >
                    <DotsThreeOutline className="w-4 h-4" weight="bold" aria-hidden />
                  </button>
                  {chromeMoreOpen && (
                    <div
                      role="menu"
                      data-testid="shell-chrome-overflow"
                      className="ux-elev-popover absolute right-0 top-full z-50 mt-1.5 min-w-[14rem] overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-1 shadow-lg"
                    >
                      {onOpenWorkspace && (
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="shell-study-workspace"
                          data-tour="dashboard-workspace-cta"
                          {...workspaceEntryPrefetchHandlers()}
                          onClick={() => {
                            setChromeMoreOpen(false);
                            onOpenWorkspace();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-text-primary hover:bg-surface-hover"
                        >
                          <Layout className="w-3.5 h-3.5 text-text-tertiary shrink-0" aria-hidden />
                          {t('navStudyWorkspace')}
                        </button>
                      )}
                      <div
                        className="border-t border-border-subtle px-3 py-2"
                        data-testid="shell-chrome-status"
                      >
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                          <AllCapsLabel>{t('chromeMoreStatus')}</AllCapsLabel>
                        </p>
                        <HeaderTrustBadgeRow lang={activeLang} className="flex flex-col items-start gap-1.5" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!quietNav && onOpenWorkspace && (
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  data-testid="shell-study-workspace"
                  data-tour="dashboard-workspace-cta"
                  {...workspaceEntryPrefetchHandlers()}
                  className="hidden md:inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-brand-500/35 text-[11px] font-medium leading-none text-brand-800 hover:bg-brand-600/10 transition-colors whitespace-nowrap"
                >
                  <Layout className="w-3.5 h-3.5 shrink-0" />
                  {t('navStudyWorkspace')}
                </button>
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
          data-quiet-nav={quietNav ? 'true' : undefined}
          tabIndex={-1}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border-subtle outline-none pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="flex items-center justify-around min-h-16 px-1 py-1">
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
              const label = item.kind === 'view' ? t(item.entry.labelKey) : t(item.labelKey);
              const workspaceHint = t('shellMobileWorkspaceHint');
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
                    'platform-nav-mobile-item relative flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all min-w-[52px] max-w-[80px] min-h-[44px]',
                    active ? 'platform-nav-mobile-active' : 'text-text-tertiary',
                    item.kind === 'workspace' && !active && 'text-brand-600',
                  )}
                  title={item.kind === 'workspace' ? `${label} — ${workspaceHint}` : label}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="type-micro font-medium w-full text-center leading-tight">
                    {label}
                  </span>
                  {/* OPT-C7 — under Minimal, hint stays in title only (less label noise). */}
                  {item.kind === 'workspace' && !quietNav && (
                    <span className="type-micro text-[10px] text-text-tertiary truncate w-full text-center">
                      {workspaceHint}
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
