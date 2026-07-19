import type { ElementType } from 'react';
import { Sparkles, Lock, FileText } from '@/lib/lucide-shim';
import type { AgentMode, UserSettings } from '../../types';
import { AGENT_MODE_VISUALS } from '../../lib/agentCatalog';
import { cn } from '../../utils/cn';
import type { AgentSourceModeOption } from '../../lib/agentContent';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

const SOURCE_ICONS: Record<UserSettings['sourceMode'], ElementType> = {
  strict: Lock,
  enriched: Sparkles,
  'notes-only': FileText,
};

export type AgentCatalogMode = {
  mode: AgentMode;
  label: string;
  desc: string;
  icon: ElementType;
};

type AgentModeSidebarProps = {
  modes: AgentCatalogMode[];
  selectedMode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
  sourceMode: UserSettings['sourceMode'];
  onChangeSourceMode?: (mode: UserSettings['sourceMode']) => void;
  sourceModeOptions: AgentSourceModeOption[];
  tutorModeHeading: string;
  sourceModeHeading: string;
  className?: string;
};

export function AgentModeSidebar({
  modes,
  selectedMode,
  onSelectMode,
  sourceMode,
  onChangeSourceMode,
  sourceModeOptions,
  tutorModeHeading,
  sourceModeHeading,
  className,
}: AgentModeSidebarProps) {
  /** OPT-C2 — one accent under Minimal; keep every mode reachable. */
  const quietModes = useMinimalTheme();
  return (
    <aside
      className={cn(
        'flex-shrink-0 flex-col border-r border-border-subtle bg-surface-card/50 overflow-hidden',
        quietModes ? 'w-56' : 'w-72',
        className,
      )}
      data-testid="agent-mode-sidebar"
      data-quiet-modes={quietModes ? 'true' : undefined}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            {tutorModeHeading}
          </p>
          <div className="space-y-1">
            {modes.map((m) => {
              const Icon = m.icon;
              const visual = AGENT_MODE_VISUALS[m.mode];
              const active = selectedMode === m.mode;
              return (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => onSelectMode(m.mode)}
                  className={cn(
                    'w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all',
                    active
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : 'hover:bg-surface-hover/60 border border-transparent',
                  )}
                  data-testid={`agent-mode-${m.mode}`}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      quietModes && 'bg-surface-hover text-text-secondary',
                    )}
                    style={quietModes ? undefined : { backgroundColor: `${visual.color}20` }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={quietModes ? undefined : { color: visual.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-medium', active ? 'text-text-primary' : 'text-text-secondary')}>
                        {m.label}
                      </span>
                      {visual.badge && (
                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-brand-500/20 text-brand-400">
                          {visual.badge}
                        </span>
                      )}
                    </div>
                    {!quietModes && (
                      <p className="text-[10px] text-text-tertiary leading-tight mt-0.5 hidden xl:block">
                        {m.desc}
                      </p>
                    )}
                  </div>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {onChangeSourceMode && (
          <div className="p-4 border-b border-border-subtle">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              {sourceModeHeading}
            </p>
            {sourceModeOptions.map((opt) => {
              const Icon = SOURCE_ICONS[opt.id];
              const active = sourceMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSourceMode(opt.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-2.5 rounded-xl text-left mb-1.5 transition-all',
                    active
                      ? 'bg-surface-hover border border-border-subtle'
                      : 'hover:bg-surface-hover/40 border border-transparent',
                  )}
                  data-testid={`agent-source-mode-${opt.id}`}
                >
                  <Icon className={cn('w-3.5 h-3.5 mt-0.5', active ? 'text-brand-400' : 'text-text-tertiary')} />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{opt.label}</p>
                    <p className="text-[10px] text-text-tertiary">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

export function AgentModeCatalogGrid({
  modes,
  selectedMode,
  onSelectMode,
  onClose,
}: {
  modes: AgentCatalogMode[];
  selectedMode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
  onClose?: () => void;
}) {
  const quietModes = useMinimalTheme();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="agent-mode-catalog" data-quiet-modes={quietModes ? 'true' : undefined}>
      {modes.map((m) => {
        const Icon = m.icon;
        const visual = AGENT_MODE_VISUALS[m.mode];
        const active = selectedMode === m.mode;
        return (
          <button
            key={m.mode}
            type="button"
            onClick={() => {
              onSelectMode(m.mode);
              onClose?.();
            }}
            title={m.desc}
            className={cn(
              'ux-card p-2.5 text-left transition-all',
              active ? 'border-brand-500/35 ring-1 ring-brand-500/20' : 'hover:border-brand-500/20',
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center mb-1.5',
                quietModes && 'bg-surface-hover text-text-secondary',
              )}
              style={quietModes ? undefined : { backgroundColor: `${visual.color}20` }}
            >
              <Icon
                className="w-3.5 h-3.5"
                style={quietModes ? undefined : { color: visual.color }}
              />
            </div>
            <p className="text-xs font-medium text-text-primary">{m.label}</p>
            {!quietModes && (
              <p className="text-[10px] text-text-tertiary line-clamp-2">{m.desc}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
