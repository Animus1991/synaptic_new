import type { AgentMessage } from '../types';
import type { ChatMessage } from './llmClient';

/** Max prior user+agent pairs sent to the LLM (excluding the current turn). */
export const MAX_AGENT_HISTORY_TURNS = 8;

function isHistoryEligible(msg: AgentMessage): boolean {
  if (msg.role === 'system') return false;
  if (msg.isStreaming) return false;
  if (!msg.content.trim()) return false;
  return true;
}

/** Map stored agent messages to OpenAI-style chat roles for multi-turn memory. */
export function buildAgentChatHistory(
  messages: AgentMessage[],
  maxTurns = MAX_AGENT_HISTORY_TURNS,
): ChatMessage[] {
  const eligible = messages.filter(isHistoryEligible);
  const maxMessages = maxTurns * 2;
  const window = eligible.slice(-maxMessages);
  return window.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content.trim(),
  }));
}
