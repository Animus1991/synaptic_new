import type { AppView, User } from '../types';
import { showStandaloneAgentNav } from './platformFocus';
import {
  NAVIGATION_REGISTRY,
  type NavRegistryEntry,
  type ShellNavView,
} from './navigationRegistry';

export type NavCapability = 'teacher' | 'student-org';

export function resolveNavCapabilities(user: User): Set<NavCapability> {
  const caps = new Set<NavCapability>();
  if (user.role === 'teacher') caps.add('teacher');
  if (
    user.role === 'student'
    || user.segment === 'university'
    || user.segment === 'highschool'
  ) {
    caps.add('student-org');
  }
  return caps;
}

function entryAllowsUser(entry: NavRegistryEntry, caps: Set<NavCapability>): boolean {
  if (entry.requiresAgentNav && !showStandaloneAgentNav()) return false;
  if (entry.requiredCapability && !caps.has(entry.requiredCapability)) return false;
  return true;
}

export function filterNavigationRegistry(user: User): NavRegistryEntry[] {
  const caps = resolveNavCapabilities(user);
  return NAVIGATION_REGISTRY.filter((entry) => entryAllowsUser(entry, caps));
}

export function canAccessShellView(view: AppView, user: User): boolean {
  const entry = NAVIGATION_REGISTRY.find((e) => e.view === view);
  if (!entry) return true;
  return entryAllowsUser(entry, resolveNavCapabilities(user));
}

export function paletteNavEntries(user: User): NavRegistryEntry[] {
  return filterNavigationRegistry(user).filter((e) => e.showInPalette);
}

export function unauthorizedRedirectView(_view: ShellNavView): AppView {
  return 'dashboard';
}
