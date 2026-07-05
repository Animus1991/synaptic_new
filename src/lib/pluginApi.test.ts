import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerSynapsePlugin,
  unregisterSynapsePlugin,
  listSynapsePlugins,
  runPluginHook,
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
});
