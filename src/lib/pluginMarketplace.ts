import { loadJson, saveJson } from './persistence';
import {
  listSynapsePlugins,
  registerSynapsePlugin,
  unregisterSynapsePlugin,
  type SynapsePlugin,
} from './pluginApi';
import { REFERENCE_PLUGINS } from './referencePlugins';

const ENABLED_KEY = 'synapse-plugin-enabled';

const catalog = new Map<string, SynapsePlugin>();

function loadEnabledIds(): Set<string> {
  const ids = loadJson<string[]>(ENABLED_KEY, []);
  return new Set(ids);
}

function saveEnabledIds(ids: Set<string>): void {
  saveJson(ENABLED_KEY, [...ids]);
}

export function registerCatalogPlugin(plugin: SynapsePlugin): void {
  catalog.set(plugin.id, plugin);
}

export function listPluginCatalog(): SynapsePlugin[] {
  return [...catalog.values()];
}

export function isPluginEnabled(id: string): boolean {
  return listSynapsePlugins().some((p) => p.id === id);
}

export function setPluginEnabled(id: string, enabled: boolean): void {
  const plugin = catalog.get(id);
  if (!plugin) return;
  const ids = loadEnabledIds();
  if (enabled) {
    ids.add(id);
    registerSynapsePlugin(plugin);
  } else {
    ids.delete(id);
    unregisterSynapsePlugin(id);
  }
  saveEnabledIds(ids);
}

/** Bootstrap catalog + restore enabled plugins from localStorage. */
export function initPluginMarketplace(): void {
  for (const p of REFERENCE_PLUGINS) {
    registerCatalogPlugin(p);
  }
  registerCatalogPlugin({
    id: 'synapse.demo',
    name: 'Synapse Demo Plugin',
    version: '0.1.0',
    description: 'No-op scaffold proving plugin API wiring',
    hooks: { 'leitner:beforeExport': (payload) => payload },
  });

  const enabled = loadEnabledIds();
  if (enabled.size === 0) {
    setPluginEnabled('synapse.fsrs-tags', true);
    return;
  }
  for (const id of enabled) {
    const plugin = catalog.get(id);
    if (plugin) registerSynapsePlugin(plugin);
  }
}
