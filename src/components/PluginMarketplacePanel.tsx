import { useCallback, useState } from 'react';
import { Zap } from '@/lib/lucide-shim';

import { cn } from '../utils/cn';
import {
  isPluginEnabled,
  listPluginCatalog,
  setPluginEnabled,
} from '../lib/pluginMarketplace';
import type { SynapsePlugin } from '../lib/pluginApi';
import type { I18nKey } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { UxCallout } from './ui/platformChrome';

function pluginHookLabels(plugin: SynapsePlugin, t: (key: I18nKey) => string): string[] {
  const hooks = Object.keys(plugin.hooks ?? {});
  return hooks.map((hook) => {
    if (hook === 'leitner:beforeExport') return t('pluginHookLeitnerExport');
    if (hook === 'agent:beforeReply') return t('pluginHookAgentReply');
    return hook;
  });
}

export function PluginMarketplacePanel() {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const catalog = listPluginCatalog();

  const toggle = useCallback((id: string, next: boolean) => {
    setPluginEnabled(id, next);
    setTick((n) => n + 1);
  }, []);

  if (catalog.length === 0) return null;

  const referencePlugins = catalog.filter((p) => p.id.startsWith('synapse.') && p.id !== 'synapse.demo');

  return (
    <div className="space-y-3" data-testid="plugin-marketplace">
      <UxCallout variant="info" title={t('pluginMarketplaceTitle')}>
        {t('pluginMarketplaceHint')}
      </UxCallout>
      <ul className="space-y-2">
        {referencePlugins.map((plugin) => {
          const enabled = isPluginEnabled(plugin.id);
          const hooks = pluginHookLabels(plugin, t);
          return (
            <li
              key={`${plugin.id}-${tick}`}
              className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-primary/50 p-3"
            >
              <Zap className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{plugin.name}</p>
                <p className="text-[11px] text-text-muted">{plugin.description ?? plugin.id}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {hooks.map((label) => (
                    <span
                      key={label}
                      className="rounded-md border border-border-subtle bg-surface-card px-1.5 py-0.5 text-[9px] font-medium text-text-tertiary"
                    >
                      {label}
                    </span>
                  ))}
                  <span className="rounded-md border border-border-subtle/60 px-1.5 py-0.5 text-[9px] text-text-muted">
                    v{plugin.version}
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid={`plugin-toggle-${plugin.id}`}
                onClick={() => toggle(plugin.id, !enabled)}
                className={cn(
                  'text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors shrink-0',
                  enabled
                    ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary',
                )}
              >
                {enabled ? t('pluginEnabled') : t('pluginEnable')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
