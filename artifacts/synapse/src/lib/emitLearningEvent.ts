/**
 * §2.2 Unified learning event path — one emit for analytics + correlation fan-out.
 */

import { appendLearningEvent, type LearningEventType } from './learningEvents';
import {
  appendCorrelationEvent,
  correlationPayloadForSignal,
  correlationTypeForSignal,
  type CorrelationEventType,
  type CorrelationFanOut,
} from './workspaceCorrelationEvents';
import {
  recordConceptActivity,
  type ConceptBusState,
  type ConceptSignal,
} from './workspaceConceptBus';
import type { WorkspaceToolId } from './taskFlows';

const CORRELATION_TO_ANALYTICS: Partial<Record<CorrelationEventType, LearningEventType>> = {
  'quiz.answered': 'quiz_attempted',
};

function mirrorCorrelationToAnalytics(
  eventType: CorrelationEventType,
  input: EmitWorkspaceConceptInput,
  fanOut: CorrelationFanOut,
): void {
  const dedicated = CORRELATION_TO_ANALYTICS[eventType];
  const payload = {
    correlationType: eventType,
    tool: input.tool,
    confidence: input.confidence,
    ...(fanOut.event.payload ?? {}),
  };
  if (dedicated) {
    appendLearningEvent(
      dedicated,
      { ...payload, correct: fanOut.event.payload?.correct === true },
      { courseId: input.courseId, concept: input.conceptId },
    );
    return;
  }
  appendLearningEvent(
    'workspace_correlated',
    payload,
    { courseId: input.courseId, concept: input.conceptId },
  );
}

export type EmitWorkspaceConceptInput = {
  conceptId: string;
  tool: WorkspaceToolId;
  signal: ConceptSignal;
  confidence: number;
  sectionId?: string;
  courseId?: string;
};

/**
 * Deliberate workspace concept interaction — correlation log + concept-bus fan-out
 * + analytics mirror when mappable.
 */
export function emitWorkspaceConceptEvent(
  input: EmitWorkspaceConceptInput,
  conceptBus: ConceptBusState,
): CorrelationFanOut | { conceptBus: ConceptBusState } {
  const eventType = correlationTypeForSignal(input.tool, input.signal);

  if (eventType) {
    const fanOut = appendCorrelationEvent(
      {
        type: eventType,
        conceptId: input.conceptId,
        toolId: input.tool,
        confidence: input.confidence,
        sectionId: input.sectionId,
        payload: correlationPayloadForSignal(input.signal),
      },
      conceptBus,
    );

    mirrorCorrelationToAnalytics(eventType, input, fanOut);

    return fanOut;
  }

  return {
    conceptBus: recordConceptActivity(
      conceptBus,
      input.conceptId,
      input.tool,
      input.signal,
      input.confidence,
    ),
  };
}

/** Non-workspace analytics events (upload, OCR, agent grounding, etc.). */
export function emitAnalyticsLearningEvent(
  type: LearningEventType,
  payload?: Record<string, string | number | boolean>,
  opts?: { courseId?: string; concept?: string },
) {
  return appendLearningEvent(type, payload, opts);
}
