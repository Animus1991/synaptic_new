import { describe, it, expect, vi } from 'vitest';
import { handleJsonRpc, handleJsonRpcPayload } from './server';
import { LATEST_PROTOCOL_VERSION } from './types';
import type { Account } from '../store/accounts';

vi.mock('../store/libraryStore', () => ({
  getLibraryAsync: vi.fn(async () => ({
    uploadedFiles: [],
    glossaryEntries: [],
    generatedCourses: [],
    updatedAt: '',
  })),
  saveLibraryAsync: vi.fn(async () => ({})),
}));
vi.mock('../lib/ragServer', () => ({ searchGlobalLibraryGraph: vi.fn() }));
vi.mock('../store/accounts', () => ({ addUsageAsync: vi.fn() }));
vi.mock('../lib/upstream', () => ({ upstreamFetch: vi.fn(), estimateTokens: (t: string) => t.length }));
vi.mock('../config', () => ({ config: { upstreamApiKey: '' } }));

const account = { id: 'acc-1', email: 'u@example.com', plan: 'free' } as Account;
const ctx = { account };

function req(method: string, params?: Record<string, unknown>, id: number | string = 1) {
  return { jsonrpc: '2.0', id, method, ...(params ? { params } : {}) };
}

describe('MCP JSON-RPC dispatcher', () => {
  it('handshakes on initialize with protocol version and server info', async () => {
    const res = await handleJsonRpc(req('initialize', { protocolVersion: LATEST_PROTOCOL_VERSION }), ctx);
    expect(res).toBeTruthy();
    const result = (res as { result: Record<string, unknown> }).result;
    expect(result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
    expect(result.serverInfo).toMatchObject({ name: 'synapse-learning' });
    expect(result.capabilities).toMatchObject({ tools: {}, resources: {}, prompts: {} });
  });

  it('falls back to latest protocol version for an unknown request', async () => {
    const res = await handleJsonRpc(req('initialize', { protocolVersion: '1999-01-01' }), ctx);
    const result = (res as { result: Record<string, unknown> }).result;
    expect(result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('responds to ping with an empty result', async () => {
    const res = await handleJsonRpc(req('ping'), ctx);
    expect((res as { result: unknown }).result).toEqual({});
  });

  it('lists all registered tools', async () => {
    const res = await handleJsonRpc(req('tools/list'), ctx);
    const tools = (res as { result: { tools: { name: string }[] } }).result.tools;
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'echo',
        'list_courses',
        'get_course_outline',
        'search_library',
        'get_progress',
        'list_glossary',
        'mark_lesson_complete',
        'generate_quiz',
      ]),
    );
    expect(tools.every((t) => typeof t.name === 'string')).toBe(true);
  });

  it('returns method-not-found for unknown methods', async () => {
    const res = await handleJsonRpc(req('does/notexist'), ctx);
    expect((res as { error: { code: number } }).error.code).toBe(-32601);
  });

  it('returns invalid-params for unknown tool calls', async () => {
    const res = await handleJsonRpc(req('tools/call', { name: 'nope', arguments: {} }), ctx);
    expect((res as { error: { code: number } }).error.code).toBe(-32602);
  });

  it('treats messages without an id as notifications (no response)', async () => {
    const res = await handleJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx);
    expect(res).toBeNull();
  });

  it('rejects malformed messages', async () => {
    const res = await handleJsonRpc(42, ctx);
    expect((res as { error: { code: number } }).error.code).toBe(-32600);
  });

  it('handles batch payloads and filters out notification responses', async () => {
    const res = await handleJsonRpcPayload(
      [req('ping', undefined, 1), { jsonrpc: '2.0', method: 'notifications/initialized' }, req('tools/list', undefined, 2)],
      ctx,
    );
    expect(Array.isArray(res)).toBe(true);
    expect((res as unknown[]).length).toBe(2);
  });

  it('runs echo through tools/call', async () => {
    const res = await handleJsonRpc(req('tools/call', { name: 'echo', arguments: { message: 'hi' } }), ctx);
    const result = (res as { result: { content: { text: string }[] } }).result;
    expect(result.content[0].text).toBe('hi');
  });

  it('lists resources including the library summary', async () => {
    const res = await handleJsonRpc(req('resources/list'), ctx);
    const resources = (res as { result: { resources: { uri: string }[] } }).result.resources;
    expect(resources.some((r) => r.uri === 'synapse://library/summary')).toBe(true);
  });

  it('reads the library summary resource', async () => {
    const res = await handleJsonRpc(req('resources/read', { uri: 'synapse://library/summary' }), ctx);
    const contents = (res as { result: { contents: { uri: string; text: string }[] } }).result.contents;
    expect(contents[0].uri).toBe('synapse://library/summary');
    expect(JSON.parse(contents[0].text)).toHaveProperty('courseCount');
  });

  it('errors on an unknown resource uri', async () => {
    const res = await handleJsonRpc(req('resources/read', { uri: 'synapse://bogus' }), ctx);
    expect((res as { error: { code: number } }).error.code).toBe(-32602);
  });

  it('lists resource templates', async () => {
    const res = await handleJsonRpc(req('resources/templates/list'), ctx);
    const templates = (res as { result: { resourceTemplates: { uriTemplate: string }[] } }).result
      .resourceTemplates;
    expect(templates[0].uriTemplate).toContain('{courseId}');
  });

  it('lists prompts', async () => {
    const res = await handleJsonRpc(req('prompts/list'), ctx);
    const prompts = (res as { result: { prompts: { name: string }[] } }).result.prompts;
    expect(prompts.map((p) => p.name)).toEqual(
      expect.arrayContaining(['study_plan', 'explain_weak_areas', 'quiz_me']),
    );
  });

  it('gets a prompt with filled arguments', async () => {
    const res = await handleJsonRpc(req('prompts/get', { name: 'study_plan', arguments: { courseId: 'c1' } }), ctx);
    const result = (res as { result: { messages: { content: { text: string } }[] } }).result;
    expect(result.messages[0].content.text).toContain('c1');
  });

  it('errors when a required prompt argument is missing', async () => {
    const res = await handleJsonRpc(req('prompts/get', { name: 'study_plan', arguments: {} }), ctx);
    expect((res as { error: { code: number } }).error.code).toBe(-32602);
  });
});
