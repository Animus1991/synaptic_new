import { loadJson, saveJson } from './persistence';

const RECENT_KEY = 'command-palette-recent';
const MAX_RECENT = 6;

export function loadRecentCommandKeys(): string[] {
  return loadJson<string[]>(RECENT_KEY, []);
}

export function recordRecentCommandKey(key: string): void {
  const norm = key.trim();
  if (!norm) return;
  const prev = loadRecentCommandKeys().filter((k) => k !== norm);
  saveJson(RECENT_KEY, [norm, ...prev].slice(0, MAX_RECENT));
}

/** Stable key for workspace palette items (prefixed to avoid app-palette collisions). */
export function workspaceCommandKey(id: string): string {
  return `ws:${id.trim()}`;
}

export function commandActionKey(action: {
  type: string;
  label: string;
  view?: string;
  taskId?: string;
  session?: string;
}): string {
  if (action.type === 'navigate' && action.view) return `nav:${action.view}`;
  if (action.type === 'task' && action.taskId) return `task:${action.taskId}`;
  if (action.type === 'session' && action.session) return `session:${action.session}`;
  if (action.type === 'workspace') return 'workspace';
  if (action.type === 'next-action') return 'next-action';
  return `${action.type}:${action.label}`;
}
