import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerSynapsePlugin,
  unregisterSynapsePlugin,
  listSynapsePlugins,
  runPluginHook,
  applyAgentBeforeReplyPlugins,
  applyCourseAfterGeneratePlugins,
} from './pluginApi';

beforeEach(() => {
  for (const p of listSynapsePlugins()) unregisterSynapsePlugin(p.id);
});

describe('pluginApi', () => {
  it('registers and lists plugins', () => {
    registerSynapsePlugin({ id: 'test.one', name: 'Test', version: '1.0.0' });
    expect(listSynapsePlugins().map((p) => p.id)).toContain('test.one');
  });

  it('runs hook chain', async () => {
    registerSynapsePlugin({
      id: 'adder',
      name: 'Adder',
      version: '1.0.0',
      hooks: {
        'leitner:beforeExport': (payload) => ({ ...(payload as object), tagged: true }),
      },
    });
    const out = await runPluginHook('leitner:beforeExport', { cards: [] });
    expect(out).toEqual({ cards: [], tagged: true });
  });

  it('applies agent:beforeReply text from enabled plugins', async () => {
    registerSynapsePlugin({
      id: 'preface',
      name: 'Preface',
      version: '1.0.0',
      hooks: {
        'agent:beforeReply': (payload) => {
          const body = payload as { text?: string; studyMode?: boolean };
          if (!body.studyMode || !body.text) return payload;
          return { ...body, text: `[Study focus] ${body.text}` };
        },
      },
    });
    await expect(applyAgentBeforeReplyPlugins('Hello', true)).resolves.toBe('[Study focus] Hello');
    await expect(applyAgentBeforeReplyPlugins('Hello', false)).resolves.toBe('Hello');
  });

  it('applies course:afterGenerate course payload', async () => {
    registerSynapsePlugin({
      id: 'stamp',
      name: 'Stamp',
      version: '1.0.0',
      hooks: {
        'course:afterGenerate': (payload) => {
          const body = payload as { course: { id: string; title: string } };
          return { course: { ...body.course, title: `${body.course.title} ★` } };
        },
      },
    });
    const next = await applyCourseAfterGeneratePlugins({ id: 'c1', title: 'Econ' });
    expect(next.title).toBe('Econ ★');
  });
});
