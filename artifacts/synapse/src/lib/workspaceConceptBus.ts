/**
 * Workspace concept bus.
 *
 * A shared, in-session record of how the learner engages each concept *across*
 * the workspace tools — so the tools stop behaving as isolated islands. Every
 * tool reports real activity (focusing a term, passing a quiz, rating a Leitner
 * card, explaining it in Feynman, mapping it, annotating it). The bus turns that
 * stream into a per-concept engagement profile the UI can surface (a "Concept
 * Lens"): which tools touched a concept, how broadly it was studied, and whether
 * the learner is struggling with it.
 *
 * This is deliberately *honest*: it tracks what actually happened in the
 * session, not theoretical coverage. No fabricated signals.
 */

import type { WorkspaceToolId } from './taskFlows';
import { normalizeFocusTerm } from './workspaceFocus';

/** A concrete, observed interaction signal a tool can emit for a concept. */
export type ConceptSignal =
  | 'focus' // brought into shared focus
  | 'read' // viewed in the cognitive reader / source
  | 'mapped' // touched in the concept map
  | 'noted' // captured in scratchpad / notes / whiteboard
  | 'annotated' // highlighted / annotated in source
  | 'explained' // articulated in Feynman self-explanation
  | 'simulated' // explored quantitatively in the parametric sandbox
  | 'quiz-correct'
  | 'quiz-wrong'
  | 'leitner-easy'
  | 'leitner-hard'
  | 'annotated-confusing'
  | 'annotated-exam';

/** Signals that indicate the learner is finding a concept difficult. */
const STRUGGLE_SIGNALS: ReadonlySet<ConceptSignal> = new Set<ConceptSignal>([
  'quiz-wrong',
  'leitner-hard',
  'annotated-confusing',
]);

/** Signals that indicate confident mastery of a concept. */
const MASTERY_SIGNALS: ReadonlySet<ConceptSignal> = new Set<ConceptSignal>([
  'quiz-correct',
  'leitner-easy',
  'explained',
]);

/** Navigation-only signals — tracked for engagement but not toolHitCounts. */
const PASSIVE_HIT_SIGNALS: ReadonlySet<ConceptSignal> = new Set<ConceptSignal>(['focus']);

/** True when a signal represents a deliberate learner action (not passive focus). */
export function isDeliberateConceptSignal(signal: ConceptSignal): boolean {
  return !PASSIVE_HIT_SIGNALS.has(signal);
}

export interface ConceptActivity {
  /** Display label (first non-empty form seen). */
  concept: string;
  /** Normalized key used for de-duplication. */
  key: string;
  /** Distinct tools that engaged this concept, in first-seen order. */
  tools: WorkspaceToolId[];
  /** All signals observed, in order (capped to keep memory bounded). */
  signals: ConceptSignal[];
  firstAt: number;
  lastAt: number;
  lastTool?: WorkspaceToolId;
  /** Net struggle counter: +1 per struggle signal, -1 per mastery signal. */
  struggleScore: number;
  /** Per-tool interaction count this session. */
  toolHitCounts: Partial<Record<WorkspaceToolId, number>>;
}

export type ConceptBusState = Record<string, ConceptActivity>;

const MAX_SIGNALS_PER_CONCEPT = 40;
/** Tool breadth at which a concept is considered fully "cross-studied". */
const FULL_BREADTH_TOOLS = 4;
/** Distinct signal variety at which engagement depth saturates. */
const FULL_DEPTH_SIGNALS = 5;

/**
 * Record a single concept interaction, returning a new state object
 * (immutably) so React state updates trigger re-renders predictably.
 */
export function recordConceptActivity(
  state: ConceptBusState,
  concept: string,
  tool: WorkspaceToolId,
  signal: ConceptSignal,
  now: number = Date.now(),
): ConceptBusState {
  const display = concept.trim();
  if (!display) return state;
  const key = normalizeFocusTerm(display);
  if (!key) return state;

  const existing = state[key];
  if (!existing) {
    return {
      ...state,
      [key]: {
        concept: display,
        key,
        tools: [tool],
        signals: [signal],
        firstAt: now,
        lastAt: now,
        lastTool: tool,
        struggleScore: signalDelta(signal),
        toolHitCounts: isDeliberateConceptSignal(signal) ? { [tool]: 1 } : {},
      },
    };
  }

  const tools = existing.tools.includes(tool)
    ? existing.tools
    : [...existing.tools, tool];
  const signals = [...existing.signals, signal].slice(-MAX_SIGNALS_PER_CONCEPT);
  const prevHits = existing.toolHitCounts ?? {};
  const toolHitCounts = isDeliberateConceptSignal(signal)
    ? { ...prevHits, [tool]: (prevHits[tool] ?? 0) + 1 }
    : prevHits;

  return {
    ...state,
    [key]: {
      ...existing,
      tools,
      signals,
      lastAt: now,
      lastTool: tool,
      struggleScore: existing.struggleScore + signalDelta(signal),
      toolHitCounts,
    },
  };
}

function signalDelta(signal: ConceptSignal): number {
  if (STRUGGLE_SIGNALS.has(signal)) return 1;
  if (MASTERY_SIGNALS.has(signal)) return -1;
  return 0;
}

/**
 * Engagement strength in [0,1]: a blend of how *broadly* (distinct tools) and
 * how *deeply* (distinct signal types) the concept was studied. Used to size
 * the Concept Lens indicator.
 */
export function conceptEngagement(activity: ConceptActivity): number {
  const breadth = Math.min(1, activity.tools.length / FULL_BREADTH_TOOLS);
  const distinctSignals = new Set(activity.signals).size;
  const depth = Math.min(1, distinctSignals / FULL_DEPTH_SIGNALS);
  return Math.round((0.6 * breadth + 0.4 * depth) * 100) / 100;
}

/** True when the learner has shown net difficulty with this concept. */
export function isStruggling(activity: ConceptActivity): boolean {
  return activity.struggleScore > 0;
}

/** True when the learner has shown net confident mastery this session. */
export function isConfident(activity: ConceptActivity): boolean {
  return activity.struggleScore < 0 && activity.tools.length >= 2;
}

/** Concepts engaged this session, most-recently-active first. */
export function recentConcepts(state: ConceptBusState, limit = 8): ConceptActivity[] {
  return Object.values(state)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, limit);
}

/** Concepts with the broadest cross-tool engagement, strongest first. */
export function topEngagedConcepts(state: ConceptBusState, limit = 8): ConceptActivity[] {
  return Object.values(state)
    .sort((a, b) => conceptEngagement(b) - conceptEngagement(a) || b.lastAt - a.lastAt)
    .slice(0, limit);
}

/** Look up the activity record for a concept (by normalized key). */
export function activityFor(state: ConceptBusState, concept: string): ConceptActivity | undefined {
  return state[normalizeFocusTerm(concept)];
}

/** Hydrate persisted bus entries missing newer fields (e.g. toolHitCounts). */
export function normalizeConceptActivity(activity: ConceptActivity): ConceptActivity {
  return {
    ...activity,
    toolHitCounts: activity.toolHitCounts ?? {},
    struggleScore: activity.struggleScore ?? 0,
    signals: activity.signals ?? [],
    tools: activity.tools ?? [],
  };
}

export function normalizeConceptBusState(state: ConceptBusState): ConceptBusState {
  const normalized: ConceptBusState = {};
  for (const [key, activity] of Object.entries(state)) {
    normalized[key] = normalizeConceptActivity(activity);
  }
  return normalized;
}
