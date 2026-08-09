import { useState } from 'react';
import { ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { DiagramCoachPlan, DiagramCoachStep } from '../../lib/whiteboardDiagramCoach';
import type { WhiteboardBlueprintCoverageReport } from '../../lib/whiteboardBlueprintCoverageQA';
import { blueprintKindLabel } from '../../lib/whiteboardBlueprintCoverageQA';
import { WhiteboardBlueprintCoverageStrip } from './WhiteboardBlueprintCoverageStrip';
import { useI18n } from '../../lib/i18n';

type Props = {
  plan: DiagramCoachPlan;
  coverageReport: WhiteboardBlueprintCoverageReport;
  lang: 'en' | 'el';
  onInsertLabels: (labels: string[]) => void;
  onAskAgent: (intent: 'guide' | 'step' | 'critique', step?: DiagramCoachStep) => void;
  onStepFocus?: (stepId: string | null) => void;
};

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function WhiteboardDiagramCoach({
  plan,
  coverageReport,
  lang,
  onInsertLabels,
  onAskAgent,
  onStepFocus,
}: Props) {
  /** Wave E3 — canvas-first: coach starts collapsed */
  const [expanded, setExpanded] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(plan.steps[0]?.id ?? null);
  const { t } = useI18n();

  const activeStep = plan.steps.find((s) => s.id === activeStepId) ?? null;

  const selectStep = (step: DiagramCoachStep) => {
    setActiveStepId(step.id);
    onStepFocus?.(step.id);
  };

  return (
    <div
      className="shrink-0 border-b border-transparent bg-surface-secondary/20"
      data-testid="whiteboard-diagram-coach"
      data-clarity-pass="k162"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-surface-hover/40"
      >
        <div className="min-w-0">
          <span className="type-caption font-semibold text-text-secondary truncate">
            {t('wbDiagramCoach')}
            {' · '}
            {blueprintKindLabel(plan.kind, lang)}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <WhiteboardBlueprintCoverageStrip report={coverageReport} lang={lang} />
          <p className="type-caption text-text-muted leading-relaxed">{plan.summary}</p>
          {plan.weakFocus && (
            <p className="type-caption text-accent-amber" data-testid="whiteboard-coach-weak-focus">
              {t('focusColon')} {plan.weakFocus}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              data-testid="whiteboard-coach-insert-labels"
              onClick={() => onInsertLabels(plan.nodeLabels)}
              className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {t('wbInsertLabels')}
            </button>
            <button
              type="button"
              data-testid="whiteboard-coach-ask-guide"
              onClick={() => onAskAgent('guide')}
              className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {t('wbAgentGuide')}
            </button>
            <button
              type="button"
              data-testid="whiteboard-coach-ask-critique"
              onClick={() => onAskAgent('critique')}
              className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {t('wbCritiqueSketch')}
            </button>
          </div>

          <ol className="space-y-1 max-h-36 overflow-y-auto" data-testid="whiteboard-coach-steps">
            {plan.steps.map((step) => {
              const isActive = step.id === activeStepId;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    data-testid={`whiteboard-coach-step-${step.order}`}
                    onClick={() => selectStep(step)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md border-0 px-2 py-1.5 text-left type-caption transition-colors',
                      isActive
                        ? 'bg-surface-secondary/70 text-text-secondary'
                        : 'bg-surface-secondary/35 text-text-muted hover:bg-surface-hover/50',
                    )}
                  >
                    <span className="font-mono text-text-secondary shrink-0">{step.order}</span>
                    <span>
                      <span className="font-medium text-text-secondary">{step.label}</span>
                      <span
                        className="ml-1 rounded border-0 bg-surface-secondary/60 px-1 py-0 type-caption text-text-secondary"
                        data-testid={`whiteboard-coach-tool-${step.order}`}
                      >
                        {step.toolHint}
                      </span>
                      {' — '}
                      {step.hint}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {activeStep && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeStep.boardLabel && (
                <button
                  type="button"
                  onClick={() => onInsertLabels([activeStep.boardLabel!])}
                  className="rounded-md border-0 bg-surface-secondary/50 px-2 py-0.5 type-caption text-text-muted hover:bg-surface-hover hover:text-text-primary"
                >
                  {t('wbLabel')}: {activeStep.boardLabel}
                </button>
              )}
              <button
                type="button"
                data-testid="whiteboard-coach-ask-step"
                onClick={() => onAskAgent('step', activeStep)}
                className="inline-flex items-center rounded-md border-0 bg-surface-secondary/55 px-2 py-0.5 type-caption text-text-secondary hover:bg-surface-hover"
              >
                {t('wbAgentStep').replace('{order}', String(activeStep.order))}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
