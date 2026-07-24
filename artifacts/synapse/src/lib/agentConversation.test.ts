import { describe, expect, it } from 'vitest';
import { buildAgentChatHistory, MAX_AGENT_HISTORY_TURNS } from './agentConversation';
import type { AgentMessage } from '../types';

function msg(partial: Partial<AgentMessage> & Pick<AgentMessage, 'role' | 'content'>): AgentMessage {
  return {
    id: partial.id ?? `m-${Math.random()}`,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    ...partial,
  };
}

describe('buildAgentChatHistory', () => {
  it('maps user/agent roles to user/assistant and skips system + streaming', () => {
    const history = buildAgentChatHistory([
      msg({ role: 'system', content: 'ignored' }),
      msg({ role: 'user', content: 'Hello' }),
      msg({ role: 'agent', content: 'Hi there' }),
      msg({ role: 'agent', content: '', isStreaming: true }),
    ]);
    expect(history).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);
  });

  it('trims to the last N turns', () => {
    const messages: AgentMessage[] = [];
    for (let i = 0; i < MAX_AGENT_HISTORY_TURNS + 2; i++) {
      messages.push(msg({ role: 'user', content: `u${i}` }));
      messages.push(msg({ role: 'agent', content: `a${i}` }));
    }
    const history = buildAgentChatHistory(messages);
    expect(history).toHaveLength(MAX_AGENT_HISTORY_TURNS * 2);
    expect(history[0]?.content).toBe(`u${2}`);
    expect(history[history.length - 1]?.content).toBe(`a${MAX_AGENT_HISTORY_TURNS + 1}`);
  });
});
