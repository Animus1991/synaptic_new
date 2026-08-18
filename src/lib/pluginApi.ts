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

export async function applyAgentBeforeReplyPlugins(text: string, studyMode: boolean): Promise<string> {
  const out = await runPluginHook('agent:beforeReply', { text, studyMode });
  if (out && typeof out === 'object' && 'text' in out) {
    const next = (out as { text?: unknown }).text;
    if (typeof next === 'string') return next;
  }
  return text;
}

export async function applyCourseAfterGeneratePlugins<T extends { id: string }>(course: T): Promise<T> {
  const out = await runPluginHook('course:afterGenerate', { course });
  if (out && typeof out === 'object' && 'course' in out) {
    const next = (out as { course?: T }).course;
    if (next && typeof next === 'object' && typeof next.id === 'string') return next;
  }
  return course;
}

/** Kept for tests; production catalog no longer registers a no-op demo plugin. */
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
