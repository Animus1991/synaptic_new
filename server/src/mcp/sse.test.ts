import { describe, expect, it } from 'vitest';
import { wantsMcpSse } from './sse';

describe('MCP SSE (MCP-01)', () => {
  it('detects Accept: text/event-stream', () => {
    expect(wantsMcpSse({ headers: { accept: 'text/event-stream' } })).toBe(true);
  });

  it('detects generate_quiz stream argument', () => {
    expect(
      wantsMcpSse({
        headers: {},
        body: {
          method: 'tools/call',
          params: { name: 'generate_quiz', arguments: { stream: true } },
        },
      }),
    ).toBe(true);
  });

  it('defaults to JSON for ordinary tool calls', () => {
    expect(
      wantsMcpSse({
        headers: { accept: 'application/json' },
        body: { method: 'tools/call', params: { name: 'echo', arguments: {} } },
      }),
    ).toBe(false);
  });
});
