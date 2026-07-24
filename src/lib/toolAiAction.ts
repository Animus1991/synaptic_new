/**
 * OPT-AI-A — central router for in-tool AI intents.
 * Prefer local/heuristic → RAG context packet → cheap LLM → Agent handoff.
 * Never require a cloud key for the local path.
 */

import type { AgentMode, UserSettings } from '../types';
import type { Lang } from './i18n';
import { isLlmAvailable } from './llmClient';
import type { WorkspaceToolId } from './taskFlows';

export type ToolAiIntent =
  | 'quiz-error-diagnosis'
  | 'smart-flashcard'
  | 'path-try'
  | 'scratchpad-step-hint'
  | 'compare-source-diff'
  | 'debate-counter';

export type ToolAiRouteKind = 'local' | 'llm' | 'agent-handoff';

export type ToolAiActionRequest = {
  tool: WorkspaceToolId;
  intent: ToolAiIntent;
  lang: Lang;
  concept?: string;
  sectionTitle?: string;
  text?: string;
  settings?: UserSettings;
  /** Force offline/local even when LLM is configured. */
  preferLocal?: boolean;
};

export type ToolAiActionResult<T = unknown> = {
  kind: ToolAiRouteKind;
  intent: ToolAiIntent;
  usedLlm: boolean;
  data: T;
  /** Optional Agent handoff payload when dialogue is needed. */
  agentHandoff?: {
    prompt: string;
    mode: AgentMode;
    autoSend?: boolean;
  };
};

/** Decide whether this intent should call the LLM under current settings. */
export function resolveToolAiRoute(
  req: Pick<ToolAiActionRequest, 'intent' | 'settings' | 'preferLocal'>,
): ToolAiRouteKind {
  if (req.preferLocal) return 'local';
  if (!isLlmAvailable(req.settings)) return 'local';
  // Dialogic intents prefer Agent handoff; structured micro-tasks use LLM inline.
  if (req.intent === 'path-try') return 'agent-handoff';
  if (
    req.intent === 'quiz-error-diagnosis'
    || req.intent === 'smart-flashcard'
    || req.intent === 'scratchpad-step-hint'
    || req.intent === 'compare-source-diff'
    || req.intent === 'debate-counter'
  ) {
    return 'llm';
  }
  return 'local';
}

export function toolAiCanUseLlm(settings?: UserSettings, preferLocal?: boolean): boolean {
  if (preferLocal) return false;
  return isLlmAvailable(settings);
}
