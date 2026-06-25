/**
 * §2.2 LearningEvent correlation bus — deliberate workspace actions only.
 * Single append path; selectors project Weak Areas, Concept Bus, Next Action, Progress.
 */

import type { WorkspaceToolId } from './taskFlows';
import {
  activityFor,
  recordConceptActivity,
  type ConceptBusState,
  type ConceptSignal,
  isDeliberateConceptSignal,
} from './workspaceConceptBus';
import { normalizeFocusTerm } from './workspaceFocus';

export type CorrelationEventType =
  | 'quiz.answered'
  | 'card.reviewed'
  | 'feynman.submitted'
  | 'annotation.created'
  | 'confusion.marked'
  | 'compare.generated'
  | 'debate.generated'
  | 'sim.completed'
  | 'timer.completed'
  | 'whiteboard.saved'
  | 'scratchpad.saved'
  | 'reader.section.completed';

export type CorrelationEvent = {
  id: string;
  ts: string;
  type: CorrelationEventType;
  conceptId: string;
  sectionId?: string;
  toolId: WorkspaceToolId;
  confidence: number;
  payload?: Record<string, string | number | boolean>;
};

const STORAGE_KEY = 'synapse:workspace-correlation-events-v1';
const MAX_EVENTS = 300;

function readAll(): CorrelationEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CorrelationEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(events: CorrelationEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota */
  }
}

export function listCorrelationEvents(limit = 50): CorrelationEvent[] {
  return readAll().slice(-limit).reverse();
}

/** Map correlation event → concept-bus signal + tool. */
function eventToConceptSignal(
  event: CorrelationEvent,
): { tool: WorkspaceToolId; signal: ConceptSignal } | null {
  switch (event.type) {
    case 'quiz.answered':
      return {
        tool: 'quiz',
        signal: event.payload?.correct === true ? 'quiz-correct' : 'quiz-wrong',
      };
    case 'card.reviewed':
      return {
        tool: 'leitner',
        signal: event.payload?.easy === true ? 'leitner-easy' : 'leitner-hard',
      };
    case 'feynman.submitted':
      return { tool: 'feynman', signal: 'explained' };
    case 'annotation.created':
      return { tool: 'annotations', signal: 'annotated' };
    case 'confusion.marked':
      return { tool: 'annotations', signal: 'annotated-confusing' };
    case 'compare.generated':
      return { tool: 'compare', signal: 'noted' };
    case 'debate.generated':
      return { tool: 'debate', signal: 'noted' };
    case 'sim.completed':
      return { tool: 'simulator', signal: 'simulated' };
    case 'timer.completed':
      return { tool: 'timer', signal: 'noted' };
    case 'whiteboard.saved':
      return { tool: 'whiteboard', signal: 'noted' };
    case 'scratchpad.saved':
      return { tool: 'scratchpad', signal: 'noted' };
    case 'reader.section.completed':
      return { tool: 'reader', signal: 'read' };
    default:
      return null;
  }
}

export type CorrelationFanOut = {
  event: CorrelationEvent;
  conceptBus: ConceptBusState;
};

/**
 * Append one correlation event and fan out to Concept Bus in a single transaction.
 * All surfaces (Weak Areas, Next Action, MiniDashboard tool chips) should read
 * the resulting bus — not re-emit parallel signals.
 */
export function appendCorrelationEvent(
  input: Omit<CorrelationEvent, 'id' | 'ts'> & { id?: string; ts?: string },
  conceptBus: ConceptBusState,
): CorrelationFanOut {
  const event: CorrelationEvent = {
    id: input.id ?? `wce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: input.ts ?? new Date().toISOString(),
    type: input.type,
    conceptId: input.conceptId,
    sectionId: input.sectionId,
    toolId: input.toolId,
    confidence: input.confidence,
    payload: input.payload,
  };
  writeAll([...readAll(), event]);

  const mapped = eventToConceptSignal(event);
  let nextBus = conceptBus;
  if (mapped && input.conceptId.trim()) {
    nextBus = recordConceptActivity(
      conceptBus,
      input.conceptId,
      mapped.tool,
      mapped.signal,
      input.confidence,
    );
  }
  return { event, conceptBus: nextBus };
}

export function countCorrelationEventsByType(): Partial<Record<CorrelationEventType, number>> {
  const counts: Partial<Record<CorrelationEventType, number>> = {};
  for (const e of readAll()) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

export function weakConceptKeysFromBus(bus: ConceptBusState): string[] {
  return Object.values(bus)
    .filter((a) => a.struggleScore > 0)
    .sort((a, b) => b.struggleScore - a.struggleScore || b.lastAt - a.lastAt)
    .map((a) => a.concept);
}

export function conceptKeyMatches(bus: ConceptBusState, concept: string): string | undefined {
  const key = normalizeFocusTerm(concept);
  if (!key) return undefined;
  return Object.keys(bus).find((k) => k === key || normalizeFocusTerm(bus[k]!.concept) === key);
}

export function getConceptActivity(bus: ConceptBusState, concept: string) {
  const key = conceptKeyMatches(bus, concept);
  return key ? bus[key] : undefined;
}

export function toolActivityTotal(bus: ConceptBusState, tool: WorkspaceToolId): number {
  return Object.values(bus).reduce((sum, a) => sum + (a.toolHitCounts[tool] ?? 0), 0);
}

export function defaultEventConfidence(sourceQuality: number | null): number {
  if (typeof sourceQuality !== 'number') return 0.75;
  if (sourceQuality < 40) return 0.35;
  if (sourceQuality < 60) return 0.55;
  return 0.85;
}

export function correlationTypeForSignal(
  tool: WorkspaceToolId,
  signal: ConceptSignal,
): CorrelationEventType | null {
  if (!isDeliberateConceptSignal(signal)) return null;
  switch (signal) {
    case 'quiz-correct':
    case 'quiz-wrong':
      return 'quiz.answered';
    case 'leitner-easy':
    case 'leitner-hard':
      return 'card.reviewed';
    case 'explained':
      return tool === 'feynman' ? 'feynman.submitted' : null;
    case 'annotated':
      return 'annotation.created';
    case 'annotated-confusing':
      return 'confusion.marked';
    case 'simulated':
      return 'sim.completed';
    case 'read':
      return tool === 'reader' ? 'reader.section.completed' : null;
    case 'noted':
      if (tool === 'scratchpad') return 'scratchpad.saved';
      if (tool === 'whiteboard') return 'whiteboard.saved';
      if (tool === 'compare') return 'compare.generated';
      if (tool === 'debate') return 'debate.generated';
      return null;
    case 'mapped':
      return tool === 'debate' ? 'debate.generated' : null;
    default:
      return null;
  }
}

export function correlationPayloadForSignal(
  signal: ConceptSignal,
): Record<string, string | number | boolean> | undefined {
  switch (signal) {
    case 'quiz-correct':
      return { correct: true };
    case 'quiz-wrong':
      return { correct: false };
    case 'leitner-easy':
      return { easy: true };
    case 'leitner-hard':
      return { easy: false };
    default:
      return undefined;
  }
}

/** Re-export for selector consumers that need activity lookup. */
export { activityFor };
