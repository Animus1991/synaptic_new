import { useEffect, useMemo, useState, type ElementType } from 'react';
import { Sparkles, Lock, FileText, ChevronDown, ChevronRight } from '@/lib/lucide-shim';
import type { AgentMode, UserSettings } from '../../types';
import { AGENT_MODE_VISUALS } from '../../lib/agentCatalog';
import {
  groupIdForAgentMode,
  partitionAgentModesByGroup,
  type AgentModeGroupId,
} from '../../lib/agentModeGroups';
import { cn } from '../../utils/cn';
import type { AgentSourceModeOption } from '../../lib/agentContent';
import { useMinimalTheme } from '../../lib/useMinimalTheme';
import { useI18n } from '../../lib/i18n';

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

function ModeRow({
  m,
  active,
  quietModes,
  onSelectMode,
}: {
  m: AgentCatalogMode;
  active: boolean;
  quietModes: boolean;
  onSelectMode: (mode: AgentMode) => void;
}) {
  const Icon = m.icon;
  const visual = AGENT_MODE_VISUALS[m.mode];
  return (
    <button
      type="button"
      onClick={() => onSelectMode(m.mode)}
      title={m.desc}
      className={cn(
        'agent-mode-row w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all',
        active
          ? quietModes
            ? 'bg-surface-secondary border border-border-default'
            : 'bg-brand-500/15 border border-brand-500/30'
          : 'hover:bg-surface-hover/60 border border-transparent',
      )}
      data-testid={`agent-mode-${m.mode}`}
      data-active={active ? 'true' : 'false'}
    >
      <div
        className={cn(
          'agent-mode-icon w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          quietModes && 'bg-transparent border border-border-subtle text-text-secondary',
        )}
        style={quietModes ? undefined : { backgroundColor: `${visual.color}20` }}
      >
        <Icon
          className={cn('w-3.5 h-3.5', quietModes && 'text-text-secondary')}
          style={quietModes ? undefined : { color: visual.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium', active ? 'text-text-primary' : 'text-text-secondary')}>
            {m.label}
          </span>
          {visual.badge && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0 rounded-full',
                quietModes
                  ? 'border border-border-subtle text-text-tertiary bg-transparent'
                  : 'bg-brand-500/20 text-brand-400',
              )}
            >
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
      {active && (
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0',
            quietModes ? 'bg-text-primary' : 'bg-brand-400',
          )}
        />
      )}
    </button>
  );
}

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
  /** OPT-C2 / OPT-R14 — quiet + grouped under Minimal; every mode stays reachable. */
  const quietModes = useMinimalTheme();
  const { t } = useI18n();
  const groups = useMemo(() => partitionAgentModesByGroup(modes), [modes]);
  const [openGroups, setOpenGroups] = useState<Set<AgentModeGroupId>>(() => {
    const initial = new Set<AgentModeGroupId>(['core', groupIdForAgentMode(selectedMode)]);
    return initial;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const id = groupIdForAgentMode(selectedMode);
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [selectedMode]);

  const toggleGroup = (id: AgentModeGroupId) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex-col border-r border-border-subtle bg-surface-card/50 overflow-hidden',
        quietModes ? 'w-56 agent-modes-grouped' : 'w-72',
        className,
      )}
      data-testid="agent-mode-sidebar"
      data-quiet-modes={quietModes ? 'true' : undefined}
      data-mode-groups={quietModes ? 'true' : undefined}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            {tutorModeHeading}
          </p>

          {quietModes ? (
            <div className="space-y-2" data-testid="agent-mode-groups">
              {groups.map((group) => {
                const open = openGroups.has(group.id) || group.modes.some((m) => m.mode === selectedMode);
                const count = group.modes.length;
                return (
                  <div
                    key={group.id}
                    className="agent-mode-group rounded-lg border border-border-subtle/70 overflow-hidden"
                    data-testid={`agent-mode-group-${group.id}`}
                    data-open={open ? 'true' : 'false'}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={open}
                      aria-label={`${t('agentModeGroupToggleAria')}: ${t(group.labelKey)}`}
                      className="agent-mode-group-toggle w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-surface-hover/50 transition-colors"
                      data-testid={`agent-mode-group-toggle-${group.id}`}
                    >
                      {open ? (
                        <ChevronDown className="w-3 h-3 text-text-tertiary shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-text-tertiary shrink-0" aria-hidden />
                      )}
                      <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary truncate">
                        {t(group.labelKey)}
                      </span>
                      <span className="text-[10px] tabular-nums text-text-muted">{count}</span>
                    </button>
                    {open && (
                      <div className="space-y-0.5 px-1 pb-1.5">
                        {group.modes.map((m) => (
                          <ModeRow
                            key={m.mode}
                            m={m}
                            active={selectedMode === m.mode}
                            quietModes={quietModes}
                            onSelectMode={onSelectMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {modes.map((m) => (
                <ModeRow
                  key={m.mode}
                  m={m}
                  active={selectedMode === m.mode}
                  quietModes={false}
                  onSelectMode={onSelectMode}
                />
              ))}
            </div>
          )}
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
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 mt-0.5',
                      active
                        ? quietModes
                          ? 'text-text-primary'
                          : 'text-brand-400'
                        : 'text-text-tertiary',
                    )}
                  />
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
  const { t } = useI18n();
  const groups = useMemo(() => partitionAgentModesByGroup(modes), [modes]);

  if (!quietModes) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="agent-mode-catalog" data-quiet-modes={undefined}>
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
              data-testid={`agent-mode-${m.mode}`}
              className={cn(
                'ux-card p-2.5 text-left transition-all',
                active ? 'border-brand-500/35 ring-1 ring-brand-500/20' : 'hover:border-brand-500/20',
              )}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
                style={{ backgroundColor: `${visual.color}20` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: visual.color }} />
              </div>
              <p className="text-xs font-medium text-text-primary">{m.label}</p>
              <p className="text-[10px] text-text-tertiary line-clamp-2">{m.desc}</p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="space-y-3 agent-modes-grouped"
      data-testid="agent-mode-catalog"
      data-quiet-modes="true"
      data-mode-groups="true"
    >
      {groups.map((group) => (
        <div key={group.id} data-testid={`agent-mode-group-${group.id}`}>
          <p className="agent-mode-group-label mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {t(group.labelKey)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.modes.map((m) => {
              const Icon = m.icon;
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
                  data-testid={`agent-mode-${m.mode}`}
                  className={cn(
                    'ux-card agent-mode-catalog-tile p-2.5 text-left transition-all',
                    active
                      ? 'border-border-default bg-surface-secondary ring-0'
                      : 'hover:border-border-subtle',
                  )}
                  data-active={active ? 'true' : 'false'}
                >
                  <div className="agent-mode-icon w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 border border-border-subtle bg-transparent text-text-secondary">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-medium text-text-primary">{m.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
