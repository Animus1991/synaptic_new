import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from '@/lib/lucide-shim';
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
  defaultExpanded = true,
}: {
  lang: Lang;
  recommendation: NextActionRecommendation | null;
  onAction: (id: LearningActionId) => void;
  onReprocess?: () => void;
  understood?: boolean;
  confusing?: boolean;
  defaultExpanded?: boolean;
}) {
  const isEl = lang === 'el';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const allActions = getLearningActions(lang);
  const isReprocess = recommendation?.primary === 'reprocess';

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
      className="ws-bento-soft space-y-2.5 p-2.5"
      data-testid="workspace-learning-actions"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        data-testid="learning-actions-toggle"
      >
        <span className="ws-eyebrow text-[10px] text-text-muted">
          {isEl ? 'Επόμενη ενέργεια' : 'Next action'}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        )}
      </button>

      {!expanded && recommendation && (
        <p className="truncate text-[10px] text-text-secondary">
          {nextActionLabel(recommendation.primary, lang)}
        </p>
      )}

      {expanded && (
        <>
          {recommendation ? (
            <>
              <button
                type="button"
                onClick={runPrimary}
                data-testid="next-action-primary"
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                  isReprocess
                    ? 'ws-status-strip ws-status-warn'
                    : 'border border-brand-500/35 bg-brand-500/10 hover:bg-brand-500/15',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                  {isReprocess && <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />}
                  {nextActionLabel(recommendation.primary, lang)}
                </span>
                <span className="mt-1 block text-[10px] font-normal leading-relaxed text-text-muted">
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
                          'ws-source-action-btn',
                          active && action.id === 'mark-understood' && 'ws-chip-ok',
                          active && action.id === 'mark-confusing' && 'ws-chip-warn',
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
        </>
      )}
    </div>
  );
}
