import { loadJson, saveJson } from './persistence';
import type { ConceptMapGraphSave } from './conceptMapGraph';

type MapNodeSave = { x: number; y: number; note?: string };

const MAP_KEY = 'concept-map-positions';
const WORKSPACE_KEY = 'workspace-progress';
const NOTES_KEY = 'workspace-notes';
const WHITEBOARD_KEY = 'whiteboard-strokes';
const SCRATCHPAD_KEY = 'scratchpad-formulas';

/**
 * Concept-map node positions, scoped per workspace key (task / concept).
 * Earlier MVP used a single global key, so positions bled across tasks; the
 * `scope` parameter keys an inner record so each workspace gets its own
 * layout. Falls back to the legacy global record when no scope is supplied.
 */
export function loadConceptMapPositions<T extends { id: string; x: number; y: number; note?: string }>(
  fallback: T[],
  scope?: string,
): T[] {
  const all = loadJson<Record<string, Record<string, MapNodeSave>>>(MAP_KEY, {});
  const saved = scope ? (all[scope] ?? {}) : (all['__global'] ?? {});
  if (Object.keys(saved).length === 0) return fallback;
  return fallback.map((n) => (saved[n.id] ? { ...n, ...saved[n.id] } : n));
}

export function saveConceptMapPositions(
  nodes: { id: string; x: number; y: number; note?: string }[],
  scope?: string,
): void {
  const all = loadJson<Record<string, Record<string, MapNodeSave>>>(MAP_KEY, {});
  const slot = scope ?? '__global';
  all[slot] = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y, note: n.note }]));
  saveJson(MAP_KEY, all);
}

const MAP_GRAPH_KEY = 'concept-map-graph';

/** Full graph overlay (user edits: add/rename/delete nodes, custom edges). */
export function loadConceptMapGraph(scope: string): ConceptMapGraphSave | null {
  const all = loadJson<Record<string, ConceptMapGraphSave>>(MAP_GRAPH_KEY, {});
  return all[scope] ?? null;
}

export function saveConceptMapGraph(scope: string, graph: ConceptMapGraphSave): void {
  const all = loadJson<Record<string, ConceptMapGraphSave>>(MAP_GRAPH_KEY, {});
  all[scope] = graph;
  saveJson(MAP_GRAPH_KEY, all);
  saveConceptMapPositions(graph.nodes, scope);
}

export function loadWorkspaceStep(key: string): number {
  return loadJson<Record<string, number>>(WORKSPACE_KEY, {})[key] ?? 0;
}

export function saveWorkspaceStep(key: string, step: number): void {
  const store = loadJson<Record<string, number>>(WORKSPACE_KEY, {});
  store[key] = step;
  saveJson(WORKSPACE_KEY, store);
}

/** Per-session study notes, persisted locally and keyed by workspace/task. */
export function loadWorkspaceNotes(key: string): string {
  return loadJson<Record<string, string>>(NOTES_KEY, {})[key] ?? '';
}

export function saveWorkspaceNotes(key: string, notes: string): void {
  const store = loadJson<Record<string, string>>(NOTES_KEY, {});
  if (notes.trim()) store[key] = notes;
  else delete store[key];
  saveJson(NOTES_KEY, store);
}

/* ------------------------------------------------------------------ *
 * Whiteboard strokes (scoped) — used by StudyWhiteboard.
 * Stores an opaque payload (strokes) per workspace key so that each task
 * has its own board instead of a single global one.
 * ------------------------------------------------------------------ */
export function loadWhiteboardStrokes<T = unknown>(scope: string): T | null {
  const all = loadJson<Record<string, T>>(WHITEBOARD_KEY, {});
  return all[scope] ?? null;
}

export function saveWhiteboardStrokes<T>(scope: string, strokes: T): void {
  const all = loadJson<Record<string, T>>(WHITEBOARD_KEY, {});
  all[scope] = strokes;
  saveJson(WHITEBOARD_KEY, all);
}

/* ------------------------------------------------------------------ *
 * Scratchpad formulas (scoped) — used by FormulaScratchpad.
 * ------------------------------------------------------------------ */
export function loadScratchpadFormulas<T = unknown>(scope: string): T | null {
  const all = loadJson<Record<string, T>>(SCRATCHPAD_KEY, {});
  return all[scope] ?? null;
}

export function saveScratchpadFormulas<T>(scope: string, formulas: T): void {
  const all = loadJson<Record<string, T>>(SCRATCHPAD_KEY, {});
  all[scope] = formulas;
  saveJson(SCRATCHPAD_KEY, all);
}

/* ------------------------------------------------------------------ *
 * Timer session log (scoped) — concept + step binding per workspace.
 * ------------------------------------------------------------------ */
export type TimerSessionLog = {
  at: string;
  minutes: number;
  label: string;
  preset: string;
};

const TIMER_KEY = 'timer-sessions';

export function loadTimerSessions(scope: string): TimerSessionLog[] {
  const all = loadJson<Record<string, TimerSessionLog[]>>(TIMER_KEY, {});
  return all[scope] ?? [];
}

export function appendTimerSession(scope: string, entry: TimerSessionLog): void {
  const all = loadJson<Record<string, TimerSessionLog[]>>(TIMER_KEY, {});
  const list = all[scope] ?? [];
  list.push(entry);
  all[scope] = list.slice(-20);
  saveJson(TIMER_KEY, all);
}

/* ------------------------------------------------------------------ *
 * Concept bus (scoped) — cross-tool concept engagement per workspace key.
 * Persists the shared concept activity map so interconnection survives
 * across sessions for the same task/concept.
 * ------------------------------------------------------------------ */
const CONCEPT_BUS_KEY = 'workspace-concept-bus';

export function loadConceptBus<T = unknown>(scope: string): T | null {
  const all = loadJson<Record<string, T>>(CONCEPT_BUS_KEY, {});
  return all[scope] ?? null;
}

export function saveConceptBus<T>(scope: string, state: T): void {
  const all = loadJson<Record<string, T>>(CONCEPT_BUS_KEY, {});
  all[scope] = state;
  saveJson(CONCEPT_BUS_KEY, all);
}

/** Entire scope→bus map, used for backend session sync. */
export function loadAllConceptBuses(): Record<string, unknown> {
  return loadJson<Record<string, unknown>>(CONCEPT_BUS_KEY, {});
}

/** Replace the entire scope→bus map (e.g. after pulling a remote session). */
export function replaceAllConceptBuses(map: Record<string, unknown> | null | undefined): void {
  saveJson(CONCEPT_BUS_KEY, map ?? {});
}

const EXAM_TARGET_KEY = 'exam-target';

export function loadExamTarget(scope: string): string | null {
  return loadJson<Record<string, string>>(EXAM_TARGET_KEY, {})[scope] ?? null;
}

export function saveExamTarget(scope: string, iso: string): void {
  const all = loadJson<Record<string, string>>(EXAM_TARGET_KEY, {});
  all[scope] = iso;
  saveJson(EXAM_TARGET_KEY, all);
}

const EXAM_PRACTICE_PRESET_KEY = 'exam-practice-preset';
const SIMULATOR_SCENARIO_KEY = 'simulator-scenario';

export function loadExamPracticePreset(scope: string): string | null {
  return loadJson<Record<string, string>>(EXAM_PRACTICE_PRESET_KEY, {})[scope] ?? null;
}

export function saveExamPracticePreset(scope: string, presetId: string): void {
  const all = loadJson<Record<string, string>>(EXAM_PRACTICE_PRESET_KEY, {});
  all[scope] = presetId;
  saveJson(EXAM_PRACTICE_PRESET_KEY, all);
}

export function loadLastSimulatorScenario(scope: string): string | null {
  return loadJson<Record<string, string>>(SIMULATOR_SCENARIO_KEY, {})[scope] ?? null;
}

export function saveLastSimulatorScenario(scope: string, scenarioId: string): void {
  const all = loadJson<Record<string, string>>(SIMULATOR_SCENARIO_KEY, {});
  all[scope] = scenarioId;
  saveJson(SIMULATOR_SCENARIO_KEY, all);
}
