import { loadJson, saveJson } from './persistence';

type MapNodeSave = { x: number; y: number; note?: string };

const MAP_KEY = 'concept-map-positions';
const WORKSPACE_KEY = 'workspace-progress';

export function loadConceptMapPositions(
  fallback: { id: string; x: number; y: number; note?: string }[],
): { id: string; x: number; y: number; note?: string }[] {
  const saved = loadJson<Record<string, MapNodeSave>>(MAP_KEY, {});
  if (Object.keys(saved).length === 0) return fallback;
  return fallback.map((n) => (saved[n.id] ? { ...n, ...saved[n.id] } : n));
}

export function saveConceptMapPositions(nodes: { id: string; x: number; y: number; note?: string }[]): void {
  const map = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y, note: n.note }]));
  saveJson(MAP_KEY, map);
}

export function loadWorkspaceStep(key: string): number {
  return loadJson<Record<string, number>>(WORKSPACE_KEY, {})[key] ?? 0;
}

export function saveWorkspaceStep(key: string, step: number): void {
  const store = loadJson<Record<string, number>>(WORKSPACE_KEY, {});
  store[key] = step;
  saveJson(WORKSPACE_KEY, store);
}
