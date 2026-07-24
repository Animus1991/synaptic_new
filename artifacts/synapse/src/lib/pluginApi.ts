/** Minimal plugin registry — Anki-style add-on ecosystem scaffold (L5). */
export type SynapsePluginHook =
  | 'leitner:beforeExport'
  | 'course:afterGenerate'
  | 'agent:beforeReply';

export type SynapsePlugin = {
  id: string;
  name: string;
  version: string;
  description?: string;
  hooks?: Partial<Record<SynapsePluginHook, (payload: unknown) => unknown | Promise<unknown>>>;
};

const registry = new Map<string, SynapsePlugin>();

export function registerSynapsePlugin(plugin: SynapsePlugin): void {
  if (!plugin.id?.trim()) throw new Error('plugin id required');
  registry.set(plugin.id, plugin);
}

export function unregisterSynapsePlugin(id: string): boolean {
  return registry.delete(id);
}

export function listSynapsePlugins(): SynapsePlugin[] {
  return [...registry.values()];
}

export async function runPluginHook(
  hook: SynapsePluginHook,
  payload: unknown,
): Promise<unknown> {
  let current = payload;
  for (const plugin of registry.values()) {
    const fn = plugin.hooks?.[hook];
    if (!fn) continue;
    current = await fn(current);
  }
  return current;
}

/** Built-in demo plugin for dev/testing — registers on import in dev only. */
export function registerBuiltinDemoPlugin(): void {
  registerSynapsePlugin({
    id: 'synapse.demo',
    name: 'Synapse Demo Plugin',
    version: '0.1.0',
    description: 'No-op scaffold proving plugin API wiring',
    hooks: {
      'leitner:beforeExport': (payload) => payload,
    },
  });
}
