import { ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import type { ConceptLensAction, ConceptLensView } from '../../lib/conceptGraphModel';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { conceptMatchesStepTitle, relatedConceptChips } from '../../lib/conceptLensRibbon';
import { activityFor, type ConceptBusState } from '../../lib/workspaceConceptBus';
import { ConceptLensPanel } from './ConceptLensPanel';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';

type Props = {
  conceptLensView: ConceptLensView;
  activeConceptLabel?: string;
  activeStepTitle?: string;
  conceptLensExpanded: boolean;
  onToggleExpand: () => void;
  conceptBus: ConceptBusState;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  onFocus: (term: string) => void;
  onJumpTool: (tool: WorkspaceToolId) => void;
  onAction: (action: ConceptLensAction) => void;
  onOpenReaderSection?: () => void;
  className?: string;
};

/** Inline concept ribbon + expandable lens detail — lives in workspace chrome, not over tool content. */
export function ConceptLensChromeStrip({
  conceptLensView,
  activeConceptLabel,
  activeStepTitle,
  conceptLensExpanded,
  onToggleExpand,
  conceptBus,
  activeTool,
  lang,
  onFocus,
  onJumpTool,
  onAction,
  onOpenReaderSection,
  className,
}: Props) {
  const { t } = useI18n();
  if (!conceptLensView.activeConcept) return null;

  const conceptLabel = activeConceptLabel ?? conceptLensView.activeConcept;
  const stepMatchesConcept = conceptMatchesStepTitle(conceptLabel, activeStepTitle);
  const related = relatedConceptChips(conceptLensView.related, conceptLabel);
  const activity = activityFor(conceptBus, activeConceptLabel);
  const showPrimaryPill = !stepMatchesConcept;

  if (!showPrimaryPill && related.length === 0 && !conceptLensExpanded) {
    return null;
  }

  return (
    <>
      {(showPrimaryPill || related.length > 0 || stepMatchesConcept) && (
        <div
          className={cn('ws-ribbon flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-1', className)}
          role="list"
          data-testid="concept-lens-ribbon"
        >
          {showPrimaryPill && (
            <button
              type="button"
              role="listitem"
              className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
              onClick={onToggleExpand}
              aria-expanded={conceptLensExpanded}
            >
              {conceptLabel}
            </button>
          )}
          {related.map((c) => (
            <button
              key={c.label}
              type="button"
              role="listitem"
              className="whitespace-nowrap rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover"
              onClick={() => onFocus(c.label)}
            >
              {c.label}
            </button>
          ))}
          {stepMatchesConcept && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={conceptLensExpanded}
              aria-label={conceptLensExpanded ? t('collapse') : t('lensFocusAllTools')}
              className="ml-auto shrink-0 rounded-lg border border-border-subtle bg-surface-secondary/80 p-1.5 text-text-muted hover:text-text-primary"
              data-testid="concept-lens-expand-minimal"
            >
              {conceptLensExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}

      {conceptLensExpanded && (
        <ConceptLensPanel
          placement="strip"
          lens={conceptLensView}
          activity={activity}
          activeTool={activeTool}
          expanded={conceptLensExpanded}
          onToggleExpand={onToggleExpand}
          onJumpTool={onJumpTool}
          onFocus={onFocus}
          onAction={onAction}
          onOpenReaderSection={onOpenReaderSection}
          lang={lang}
        />
      )}
    </>
  );
}
