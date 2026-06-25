import { cn } from '../../utils/cn';
import type { Lang } from '../../lib/i18n';
import { getLearningActions, type LearningActionId } from '../../lib/workspaceLearningActions';
import {
  nextActionLabel,
  type NextActionRecommendation,
} from '../../lib/nextActionEngine';

export function WorkspaceLearningActionBar({
  lang,
  recommendation,
  onAction,
  onReprocess,
  understood,
  confusing,
}: {
  lang: Lang;
  recommendation: NextActionRecommendation | null;
  onAction: (id: LearningActionId) => void;
  onReprocess?: () => void;
  understood?: boolean;
  confusing?: boolean;
}) {
  const isEl = lang === 'el';
  const allActions = getLearningActions(lang);

  const runPrimary = () => {
    if (!recommendation) return;
    if (recommendation.primary === 'reprocess') onReprocess?.();
    else onAction(recommendation.primary);
  };

  const secondaryActions = recommendation
    ? allActions.filter((a) => recommendation.secondary.includes(a.id))
    : allActions.filter((a) => !a.primary).slice(0, 3);

  return (
    <div
      className="rounded-xl border border-border-subtle bg-surface-card/80 p-2.5 space-y-2.5"
      data-testid="workspace-learning-actions"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {isEl ? 'Επόμενη ενέργεια' : 'Next action'}
      </div>

      {recommendation ? (
        <>
          <button
            type="button"
            onClick={runPrimary}
            data-testid="next-action-primary"
            className="w-full rounded-xl border border-brand-500/35 bg-brand-500/12 px-3 py-2.5 text-left transition-colors hover:bg-brand-500/18"
          >
            <span className="block text-sm font-semibold text-brand-300">
              {nextActionLabel(recommendation.primary, lang)}
            </span>
            <span className="mt-1 block text-[10px] leading-relaxed text-text-muted">
              {recommendation.reason}
            </span>
          </button>
          {secondaryActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="next-action-secondary">
              {secondaryActions.map((action) => {
                const active =
                  (action.id === 'mark-understood' && understood)
                  || (action.id === 'mark-confusing' && confusing);
                return (
                  <button
                    key={action.id}
                    type="button"
                    title={action.hint}
                    data-testid={`learning-action-${action.id}`}
                    onClick={() => onAction(action.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors',
                      'border-border-subtle text-text-secondary hover:border-brand-500/25 hover:text-brand-300',
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
        </>
      ) : (
        <p className="text-[10px] text-text-muted">
          {isEl ? 'Ανέβασε υλικό για προτάσεις μελέτης.' : 'Upload material to get study suggestions.'}
        </p>
      )}
    </div>
  );
}
