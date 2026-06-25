import { ChevronDown, ChevronUp, Link2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Lang } from '../../lib/i18n';
import type { DiscoverabilityActionId } from '../../lib/workspaceDiscoverability';
import { buildDiscoverabilitySummary } from '../../lib/workspaceDiscoverability';
import { nextActionLabel } from '../../lib/nextActionEngine';
import type { LearningActionId } from '../../lib/workspaceLearningActions';
import { getLearningActions } from '../../lib/workspaceLearningActions';

type DiscoverabilitySummary = ReturnType<typeof buildDiscoverabilitySummary>;
type ActionHandlers = Partial<Record<DiscoverabilityActionId, () => void>>;

const ACTION_LABELS: Record<DiscoverabilityActionId, { en: string; el: string }> = {
  'open-recommended-tool': { en: 'Open recommended tool', el: 'Άνοιγμα προτεινόμενου' },
  'open-reader-focus': { en: 'Read focus term', el: 'Ανάγνωση εστίασης' },
  'open-leitner-due': { en: 'Review due cards', el: 'Ληξιπρόθεσμα Leitner' },
  'jump-quiz': { en: 'Knowledge check', el: 'Έλεγχος γνώσεων' },
  'open-compare': { en: 'Open compare', el: 'Άνοιγμα σύγκρισης' },
  'open-command-palette': { en: 'Command palette ⌘K', el: 'Παλέτα εντολών ⌘K' },
  'jump-spaced-step': { en: 'Next spaced step', el: 'Επόμενο spaced βήμα' },
};

type Props = {
  summary: DiscoverabilitySummary;
  lang: Lang;
  expanded: boolean;
  onToggle: () => void;
  actions: ActionHandlers;
  onOpenRecommendedTool?: () => void;
  onRunNextAction?: () => void;
  onLearningAction?: (id: LearningActionId) => void;
  stepUnderstood?: boolean;
  stepConfusing?: boolean;
};

export function WorkspaceDiscoverabilityPanel({
  summary,
  lang,
  expanded,
  onToggle,
  actions,
  onOpenRecommendedTool,
  onRunNextAction,
  onLearningAction,
  stepUnderstood,
  stepConfusing,
}: Props) {
  const { chips, toolGuide, grounded, headline, subline, recommendedTool, nextAction } = summary;
  const isEl = lang === 'el';
  const secondaryActions = nextAction && onLearningAction
    ? getLearningActions(lang).filter((a) => nextAction.secondary.includes(a.id))
    : [];

  return (
    <div
      className="shrink-0 border-b border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/8 via-transparent to-brand-600/8"
      data-testid="workspace-discoverability"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-primary truncate">{headline}</p>
            <p className="text-[10px] text-text-tertiary truncate">{subline}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
      </button>

      <div className="flex flex-wrap gap-1.5 px-3 pb-2" data-testid="workspace-correlation-bar">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
              chip.active
                ? 'border-accent-cyan/45 bg-accent-cyan/15 text-accent-cyan'
                : 'border-white/12 bg-white/[0.05] text-text-secondary',
            )}
          >
            <span className="opacity-90">{chip.label}</span>
            <span className="font-mono font-semibold">{chip.value}</span>
          </span>
        ))}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/6 pt-2">
          {nextAction && onRunNextAction && (
            <div data-testid="discoverability-next-action">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500 mb-1.5">
                {isEl ? 'Επόμενη ενέργεια' : 'Next action'}
              </p>
              <button
                type="button"
                data-testid="discoverability-next-action-primary"
                onClick={onRunNextAction}
                className="w-full rounded-lg border border-brand-500/35 bg-brand-500/12 px-2.5 py-2 text-left transition-colors hover:bg-brand-500/18"
              >
                <span className="block text-[11px] font-semibold text-brand-300">
                  {nextActionLabel(nextAction.primary, lang)}
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-text-muted">
                  {nextAction.reason}
                </span>
              </button>
              {secondaryActions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1" data-testid="discoverability-next-action-secondary">
                  {secondaryActions.map((action) => {
                    const active =
                      (action.id === 'mark-understood' && stepUnderstood)
                      || (action.id === 'mark-confusing' && stepConfusing);
                    return (
                      <button
                        key={action.id}
                        type="button"
                        title={action.hint}
                        data-testid={`discoverability-learning-${action.id}`}
                        onClick={() => onLearningAction?.(action.id)}
                        className={cn(
                          'rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors',
                          'border-white/10 text-text-secondary hover:border-brand-500/30 hover:text-brand-200',
                          active && action.id === 'mark-understood' && 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald',
                          active && action.id === 'mark-confusing' && 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber',
                        )}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500 mb-1">
              {toolGuide.title}
            </p>
            <p className="text-[11px] text-text-secondary leading-relaxed">{toolGuide.summary}</p>
            <ul className="mt-2 space-y-1">
              {toolGuide.features.map((f) => (
                <li key={f} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                  <span className="text-accent-emerald mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {grounded && recommendedTool && onOpenRecommendedTool && (
              <button
                type="button"
                data-testid="discoverability-recommended-tool"
                onClick={onOpenRecommendedTool}
                className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/12 px-2.5 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/20"
              >
                <Sparkles className="w-3 h-3" />
                {lang === 'el' ? 'Προτεινόμενο εργαλείο' : 'Recommended tool'}
              </button>
            )}
            {toolGuide.quickActionIds.map((id) => {
              const run = actions[id];
              if (!run) return null;
              const label = ACTION_LABELS[id][lang];
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`discoverability-action-${id}`}
                  onClick={run}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:border-brand-500/40 hover:text-brand-200"
                >
                  {label}
                </button>
              );
            })}
            {actions['open-command-palette'] && (
              <button
                type="button"
                data-testid="discoverability-action-open-command-palette"
                onClick={actions['open-command-palette']}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary"
              >
                {ACTION_LABELS['open-command-palette'][lang]}
              </button>
            )}
          </div>

          {!grounded && (
            <p className="text-[10px] text-accent-amber border border-accent-amber/30 rounded-lg px-2 py-1.5 bg-accent-amber/8">
              {lang === 'el'
                ? 'Βήματα: Library → Upload → Generate course → Open Workspace'
                : 'Steps: Library → Upload → Generate course → Open Workspace'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
