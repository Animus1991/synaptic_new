import { describe, it, expect, beforeEach } from 'vitest';

import { unregisterSynapsePlugin, listSynapsePlugins } from './pluginApi';
import {
  initPluginMarketplace,
  isPluginEnabled,
  listPluginCatalog,
  setPluginEnabled,
} from './pluginMarketplace';

beforeEach(() => {
  for (const p of listSynapsePlugins()) unregisterSynapsePlugin(p.id);
  initPluginMarketplace();
});

describe('pluginMarketplace', () => {
  it('lists reference plugins in catalog', () => {
    const ids = listPluginCatalog().map((p) => p.id);
    expect(ids).toContain('synapse.fsrs-tags');
    expect(ids).toContain('synapse.export-watermark');
  });

  it('toggles plugin registration', () => {
    setPluginEnabled('synapse.export-watermark', true);
    expect(isPluginEnabled('synapse.export-watermark')).toBe(true);
    setPluginEnabled('synapse.export-watermark', false);
    expect(isPluginEnabled('synapse.export-watermark')).toBe(false);
  });
});
