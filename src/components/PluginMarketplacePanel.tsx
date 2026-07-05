import { useCallback, useState } from 'react';
import { Zap } from '@/lib/lucide-shim';

import { cn } from '../utils/cn';
import {
  isPluginEnabled,
  listPluginCatalog,
  setPluginEnabled,
} from '../lib/pluginMarketplace';
import { useI18n } from '../lib/i18n';

export function PluginMarketplacePanel() {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const catalog = listPluginCatalog();

  const toggle = useCallback((id: string, next: boolean) => {
    setPluginEnabled(id, next);
    setTick((n) => n + 1);
  }, []);

  if (catalog.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="plugin-marketplace">
      <p className="text-xs text-text-muted">{t('pluginMarketplaceHint')}</p>
      <ul className="space-y-2">
        {catalog.map((plugin) => {
          const enabled = isPluginEnabled(plugin.id);
          return (
            <li
              key={`${plugin.id}-${tick}`}
              className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-primary/50 p-3"
            >
              <Zap className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{plugin.name}</p>
                <p className="text-[11px] text-text-muted">{plugin.description ?? plugin.id}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">v{plugin.version}</p>
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
