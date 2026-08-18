import { notifySuccess } from './notificationBus';
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

export function setPluginEnabled(
  id: string,
  enabled: boolean,
  opts?: { silent?: boolean },
): void {
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
  if (!opts?.silent) {
    notifySuccess(
      enabled ? `${plugin.name} enabled` : `${plugin.name} disabled`,
      enabled ? 'Plugin hooks are active in this session' : 'Plugin hooks removed',
    );
  }
}

/** Bootstrap catalog + restore enabled plugins from localStorage. */
export function initPluginMarketplace(): void {
  catalog.clear();
  for (const p of REFERENCE_PLUGINS) {
    registerCatalogPlugin(p);
  }

  const enabled = loadEnabledIds();
  if (enabled.size === 0) {
    setPluginEnabled('synapse.fsrs-tags', true, { silent: true });
    return;
  }
  for (const id of enabled) {
    const plugin = catalog.get(id);
    if (plugin) registerSynapsePlugin(plugin);
  }
}
