/**
 * Structured learning analytics events (local-first; sync-ready for xAPI later).
 */

const STORAGE_KEY = 'synapse:learning-events-v1';
const MAX_EVENTS = 200;

export type LearningEventType =
  | 'course_generated'
  | 'citation_opened'
  | 'source_opened'
  | 'ocr_applied'
  | 'grounding_checked'
  | 'quiz_attempted'
  | 'agent_message'
  | 'workspace_correlated';

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  timestamp: string;
  courseId?: string;
  concept?: string;
  /** Arbitrary structured payload for dashboards / export. */
  payload?: Record<string, string | number | boolean>;
}

function readAll(): LearningEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LearningEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(events: LearningEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota */
  }
}

export function appendLearningEvent(
  type: LearningEventType,
  payload?: LearningEvent['payload'],
  opts?: { courseId?: string; concept?: string },
): LearningEvent {
  const event: LearningEvent = {
    id: `lev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    timestamp: new Date().toISOString(),
    courseId: opts?.courseId,
    concept: opts?.concept,
    payload,
  };
  writeAll([...readAll(), event]);
  return event;
}

export function listLearningEvents(limit = 50): LearningEvent[] {
  return readAll().slice(-limit).reverse();
}

/** Full event log for behavior inference and research export. */
export function readAllLearningEvents(): LearningEvent[] {
  return readAll();
}

export function countLearningEventsByType(): Record<LearningEventType, number> {
  const counts = {} as Record<LearningEventType, number>;
  for (const e of readAll()) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}
