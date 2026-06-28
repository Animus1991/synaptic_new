import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, LayoutTemplate, PenLine, Sparkles } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { DiagramCoachPlan, DiagramCoachStep } from '../../lib/whiteboardDiagramCoach';
import type { WhiteboardBlueprintCoverageReport } from '../../lib/whiteboardBlueprintCoverageQA';
import { blueprintKindLabel } from '../../lib/whiteboardBlueprintCoverageQA';
import { WhiteboardBlueprintCoverageStrip } from './WhiteboardBlueprintCoverageStrip';

type Props = {
  plan: DiagramCoachPlan;
  coverageReport: WhiteboardBlueprintCoverageReport;
  lang: 'en' | 'el';
  onInsertLabels: (labels: string[]) => void;
  onAskAgent: (intent: 'guide' | 'step' | 'critique', step?: DiagramCoachStep) => void;
  onStepFocus?: (stepId: string | null) => void;
};

export function WhiteboardDiagramCoach({
  plan,
  coverageReport,
  lang,
  onInsertLabels,
  onAskAgent,
  onStepFocus,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [activeStepId, setActiveStepId] = useState<string | null>(plan.steps[0]?.id ?? null);
  const isEl = lang === 'el';

  const activeStep = plan.steps.find((s) => s.id === activeStepId) ?? null;

  const selectStep = (step: DiagramCoachStep) => {
    setActiveStepId(step.id);
    onStepFocus?.(step.id);
  };

  return (
    <div
      className="shrink-0 border-b border-border-subtle bg-surface-primary/30"
      data-testid="whiteboard-diagram-coach"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-surface-hover/40"
      >
        <div className="flex items-center gap-2 min-w-0">
          <LayoutTemplate className="w-3.5 h-3.5 text-brand-700 shrink-0" />
          <span className="text-[11px] font-semibold text-text-secondary truncate">
            {isEl ? 'Diagram coach' : 'Diagram coach'}
            {' · '}
            {blueprintKindLabel(plan.kind, lang)}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <WhiteboardBlueprintCoverageStrip report={coverageReport} lang={lang} />
          <p className="text-[10px] text-text-muted leading-relaxed">{plan.summary}</p>
          {plan.weakFocus && (
            <p className="text-[10px] text-accent-amber" data-testid="whiteboard-coach-weak-focus">
              {isEl ? 'Εστίαση:' : 'Focus:'} {plan.weakFocus}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              data-testid="whiteboard-coach-insert-labels"
              onClick={() => onInsertLabels(plan.nodeLabels)}
              className="inline-flex items-center gap-1 ws-chip-brand rounded-lg border px-2 py-1 text-[10px] font-medium hover:bg-brand-600/15"
            >
              <PenLine className="w-3 h-3" />
              {isEl ? 'Ετικέτες στον πίνακα' : 'Insert labels'}
            </button>
            <button
              type="button"
              data-testid="whiteboard-coach-ask-guide"
              onClick={() => onAskAgent('guide')}
              className="inline-flex items-center gap-1 ws-chip-brand rounded-lg border px-2 py-1 text-[10px] font-medium hover:opacity-90"
            >
              <Sparkles className="w-3 h-3" />
              {isEl ? 'Agent οδηγός' : 'Agent guide'}
            </button>
            <button
              type="button"
              data-testid="whiteboard-coach-ask-critique"
              onClick={() => onAskAgent('critique')}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
            >
              <Bot className="w-3 h-3" />
              {isEl ? 'Κριτική σκίτσου' : 'Critique sketch'}
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
                      'flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[10px] transition-colors',
                      isActive
                        ? 'border-accent-cyan/40 bg-accent-cyan/8 text-text-secondary'
                        : 'border-border-subtle text-text-muted hover:bg-surface-hover/50',
                    )}
                  >
                    <span className="font-mono text-brand-800 shrink-0">{step.order}</span>
                    <span>
                      <span className="font-medium text-text-secondary">{step.label}</span>
                      <span
                        className="ml-1 rounded border border-brand-500/25 px-1 py-0 text-[8px] text-brand-800"
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
                  className="rounded-lg border border-border-subtle px-2 py-0.5 text-[9px] text-text-muted hover:text-brand-800"
                >
                  {isEl ? 'Ετικέτα' : 'Label'}: {activeStep.boardLabel}
                </button>
              )}
              <button
                type="button"
                data-testid="whiteboard-coach-ask-step"
                onClick={() => onAskAgent('step', activeStep)}
                className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/25 px-2 py-0.5 text-[9px] text-brand-800 hover:bg-accent-cyan/10"
              >
                <Sparkles className="w-3 h-3" />
                {isEl ? `Agent βήμα ${activeStep.order}` : `Agent step ${activeStep.order}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
