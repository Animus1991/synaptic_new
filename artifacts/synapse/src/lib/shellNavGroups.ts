import type { NavRegistryEntry, ShellNavView } from './navigationRegistry';

/** OPT-K1 — Cursor-like shell nav groups (labels only; all views kept). */
export type ShellNavGroupId = 'study' | 'insights' | 'organization' | 'account';

export const SHELL_NAV_GROUP_ORDER: ShellNavGroupId[] = [
  'study',
  'insights',
  'organization',
  'account',
];

const VIEW_GROUP: Record<ShellNavView, ShellNavGroupId> = {
  dashboard: 'study',
  library: 'study',
  tasks: 'study',
  agent: 'study',
  analytics: 'insights',
  teacher: 'organization',
  'student-org': 'organization',
  settings: 'account',
};

export type ShellNavGroup = {
  id: ShellNavGroupId;
  entries: NavRegistryEntry[];
};

/** Preserve registry order within each group; omit empty groups. */
export function groupShellNavEntries(entries: NavRegistryEntry[]): ShellNavGroup[] {
  const buckets = new Map<ShellNavGroupId, NavRegistryEntry[]>(
    SHELL_NAV_GROUP_ORDER.map((id) => [id, []]),
  );
  for (const entry of entries) {
    buckets.get(VIEW_GROUP[entry.view])!.push(entry);
  }
  return SHELL_NAV_GROUP_ORDER
    .map((id) => ({ id, entries: buckets.get(id)! }))
    .filter((group) => group.entries.length > 0);
}
