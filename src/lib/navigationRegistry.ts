import type { AppView } from '../types';
import type { I18nKey } from './i18n';

/** Primary shell sidebar / mobile nav views (B3 registry). */
export type ShellNavView =
  | 'dashboard'
  | 'library'
  | 'tasks'
  | 'agent'
  | 'analytics'
  | 'teacher'
  | 'student-org'
  | 'settings';

export type NavCapability = 'teacher' | 'student-org';

export type NavRegistryEntry = {
  view: ShellNavView;
  labelKey: I18nKey;
  paletteLabelKey: I18nKey;
  subtitleKey?: I18nKey;
  requiredCapability?: NavCapability;
  requiresAgentNav?: boolean;
  /** 1–3 = mobile bottom bar; overflow = More drawer */
  mobilePriority: number | 'overflow';
  showInPalette: boolean;
};

export const NAVIGATION_REGISTRY: NavRegistryEntry[] = [
  {
    view: 'dashboard',
    labelKey: 'dashboard',
    paletteLabelKey: 'navDashboard',
    subtitleKey: 'navSubtitleDashboard',
    mobilePriority: 1,
    showInPalette: true,
  },
  {
    view: 'library',
    labelKey: 'library',
    paletteLabelKey: 'navLibrary',
    subtitleKey: 'navSubtitleLibrary',
    mobilePriority: 2,
    showInPalette: true,
  },
  {
    view: 'tasks',
    labelKey: 'tasks',
    paletteLabelKey: 'navTasks',
    subtitleKey: 'navSubtitleTasks',
    mobilePriority: 3,
    showInPalette: true,
  },
  {
    view: 'agent',
    labelKey: 'agent',
    paletteLabelKey: 'navAgent',
    subtitleKey: 'navSubtitleAgent',
    requiresAgentNav: true,
    mobilePriority: 'overflow',
    showInPalette: true,
  },
  {
    view: 'analytics',
    labelKey: 'analytics',
    paletteLabelKey: 'navAnalytics',
    subtitleKey: 'navSubtitleAnalytics',
    mobilePriority: 'overflow',
    showInPalette: true,
  },
  {
    view: 'teacher',
    labelKey: 'teacher',
    paletteLabelKey: 'navTeacher',
    subtitleKey: 'navSubtitleTeacher',
    requiredCapability: 'teacher',
    mobilePriority: 'overflow',
    showInPalette: true,
  },
  {
    view: 'student-org',
    labelKey: 'studentOrg',
    paletteLabelKey: 'studentOrg',
    subtitleKey: 'navSubtitleStudentOrg',
    requiredCapability: 'student-org',
    mobilePriority: 'overflow',
    showInPalette: true,
  },
  {
    view: 'settings',
    labelKey: 'settings',
    paletteLabelKey: 'navSettings',
    subtitleKey: 'navSubtitleSettings',
    mobilePriority: 'overflow',
    showInPalette: true,
  },
];

const SHELL_NAV_SET = new Set<string>(NAVIGATION_REGISTRY.map((e) => e.view));

export function isShellNavView(view: AppView): view is ShellNavView {
  return SHELL_NAV_SET.has(view);
}

export function getShellViewLabelKey(view: AppView): I18nKey | null {
  const entry = NAVIGATION_REGISTRY.find((e) => e.view === view);
  return entry?.labelKey ?? null;
}

export function mobilePrimaryNav(visible: NavRegistryEntry[]): NavRegistryEntry[] {
  return visible.filter((e) => typeof e.mobilePriority === 'number').sort(
    (a, b) => (a.mobilePriority as number) - (b.mobilePriority as number),
  );
}

export function mobileOverflowNav(visible: NavRegistryEntry[]): NavRegistryEntry[] {
  return visible.filter((e) => e.mobilePriority === 'overflow');
}
