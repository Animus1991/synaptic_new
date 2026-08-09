import { useCallback, useMemo, useRef, useState } from 'react';
import type { ScratchpadExport } from '../../lib/workspaceScratchpadBridge';
import type { WhiteboardSessionContent } from '../../lib/whiteboardSessionModel';
import { filterWhiteboardFormulas } from '../../lib/whiteboardSessionModel';
import {
  buildDiagramCoachPlan,
  buildWhiteboardDiagramAgentPrompt,
  type DiagramCoachStep,
  type WhiteboardDiagramAgentIntent,
} from '../../lib/whiteboardDiagramCoach';
import { auditWhiteboardBlueprintCoverage } from '../../lib/whiteboardBlueprintCoverageQA';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { StudyWhiteboard } from './StudyWhiteboard';
import { WhiteboardDiagramCoach } from './WhiteboardDiagramCoach';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { useI18n } from '../../lib/i18n';
import type { WhiteboardDocument } from '../../lib/whiteboardLayers';

type WhiteboardCrdtProps = {
  doc: WhiteboardDocument;
  synced: boolean;
  connecting: boolean;
  applyLocalDoc: (next: WhiteboardDocument) => void;
};

type Props = {
  session: WhiteboardSessionContent;
  concept: string;
  lang: 'en' | 'el';
  storageScope: string;
  scratchpadImport?: ScratchpadExport | null;
  emptyMessage?: string;
  onUpload?: () => void;
  onEngage?: () => void;
  onDismissScratchpadImport?: () => void;
  onOpenInReader?: (query: string) => void;
  relatedConcepts?: string[];
  prerequisiteConcepts?: string[];
  weakFocus?: string;
  onAskAgent?: (prompt: string, intent: WhiteboardDiagramAgentIntent) => void;
  crdt?: WhiteboardCrdtProps;
};

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function WhiteboardPanel({
  session,
  concept,
  lang,
  storageScope,
  scratchpadImport,
  emptyMessage,
  onUpload,
  onEngage,
  onDismissScratchpadImport,
  onOpenInReader,
  relatedConcepts = [],
  prerequisiteConcepts = [],
  weakFocus,
  onAskAgent,
  crdt,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [labelInsertKey, setLabelInsertKey] = useState(0);
  const [labelInsertPayload, setLabelInsertPayload] = useState<string[]>([]);
  const sketchDescriptionRef = useRef('');
  const { t } = useI18n();

  const filterMatches = useMemo(
    () => filterWhiteboardFormulas(session.formulas, filterQuery),
    [session.formulas, filterQuery],
  );

  const coachPlan = useMemo(
    () => buildDiagramCoachPlan({
      concept,
      lang,
      sectionLabel: session.sectionLabel,
      referenceExcerpt: session.referenceExcerpt,
      formulas: session.formulas,
      relatedConcepts,
      prerequisiteConcepts,
      weakFocus,
    }),
    [
      concept, lang, session.sectionLabel, session.referenceExcerpt,
      session.formulas, relatedConcepts, prerequisiteConcepts, weakFocus,
    ],
  );

  const blueprintCoverage = useMemo(
    () => auditWhiteboardBlueprintCoverage({
      plan: coachPlan,
      lang,
      formulaCount: session.formulas.length,
      relatedCount: relatedConcepts.length,
      weakFocus,
      referenceExcerpt: session.referenceExcerpt,
      sectionLabel: session.sectionLabel,
    }),
    [
      coachPlan, lang, session.formulas.length, session.referenceExcerpt,
      session.sectionLabel, relatedConcepts.length, weakFocus,
    ],
  );

  const handleInsertLabels = useCallback((labels: string[]) => {
    if (labels.length === 0) return;
    setLabelInsertPayload(labels);
    setLabelInsertKey((k) => k + 1);
  }, []);

  const handleCoachAskAgent = useCallback((
    intent: WhiteboardDiagramAgentIntent,
    step?: DiagramCoachStep,
  ) => {
    if (!onAskAgent) return;
    const canvasSketch = sketchDescriptionRef.current.trim();
    const sketchDescription = intent === 'critique'
      ? (canvasSketch || t('wbSketchForCoach')
        .replace('{title}', coachPlan.title)
        .replace('{steps}', coachPlan.steps.map((s) => s.label).join(', ')))
      : canvasSketch || undefined;
    const prompt = buildWhiteboardDiagramAgentPrompt(coachPlan, lang, intent, {
      step,
      sketchDescription,
      referenceExcerpt: session.referenceExcerpt,
    });
    onAskAgent(prompt, intent);
  }, [coachPlan, t, lang, onAskAgent, session.referenceExcerpt]);

  if (!session.hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="whiteboard"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="whiteboard-panel"
      data-clarity-pass="k162">
      {/* Wave E3 — canvas first; chrome/coach demoted */}
      <div className="flex-1 min-h-0 overflow-hidden order-1">
        <StudyWhiteboard
          referenceFormulas={session.formulas}
          referenceExcerpt={session.referenceExcerpt || undefined}
          scopeKey={storageScope}
          scratchpadImport={scratchpadImport}
          onDismissScratchpadImport={onDismissScratchpadImport}
          onEngage={onEngage}
          lang={lang}
          labelInsertKey={labelInsertKey}
          labelInsertPayload={labelInsertPayload}
          coachPlan={coachPlan}
          onAskAgent={onAskAgent}
          sketchDescriptionRef={sketchDescriptionRef}
          crdt={crdt}
        />
      </div>

      <div className="shrink-0 order-2 border-t border-transparent">
        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="whiteboard-weak-extraction">
            {session.passageGrounded
              ? t('panelPassageGroundedWhiteboard')
              : t('panelWeakExtractionWhiteboard')}
          </WorkspacePanelWarnStrip>
        )}

        <WhiteboardDiagramCoach
          plan={coachPlan}
          coverageReport={blueprintCoverage}
          lang={lang}
          onInsertLabels={handleInsertLabels}
          onAskAgent={handleCoachAskAgent}
        />

        <CollapsibleChromeSection
          title={
            session.sectionLabel
              ? t('wbFormulasChromeTopic')
                .replace('{count}', String(session.formulas.length))
                .replace('{topic}', session.sectionLabel)
              : t('wbFormulasChrome').replace('{count}', String(session.formulas.length))
          }
          alwaysCollapse
          data-testid="whiteboard-chrome"
        >
          <div className="px-4 py-3 space-y-2">
            {session.sectionLabel && (
              <p className="type-caption text-text-muted" data-testid="whiteboard-section-label">
                <span className="font-medium text-text-secondary">{t('wsSectionLabel')}</span>
                <span className="ml-2 text-text-secondary">{session.sectionLabel}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {session.formulas.length > 0 && (
                <div className="min-w-[140px] max-w-xs flex-1">
                  <input
                    type="search"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={t('panelSearchFormulas')}
                    aria-label={t('panelSearchFormulasAria')}
                    className="w-full min-h-8 rounded-md border-0 bg-surface-secondary/55 py-1.5 px-2.5 type-caption text-text-secondary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                    data-testid="whiteboard-filter"
                  />
                </div>
              )}
              {session.stampCount > 0 && (
                <span className="type-caption text-text-muted">
                  <span className="ws-num">{session.stampCount}</span> LaTeX
                </span>
              )}
              {onOpenInReader && (
                <button
                  type="button"
                  onClick={() => onOpenInReader(concept)}
                  className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  data-testid="whiteboard-open-reader"
                >
                  {t('panelReaderSource')}
                </button>
              )}
            </div>
            {filterQuery.trim() && filterMatches.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="whiteboard-filter-matches">
                {filterMatches.slice(0, 6).map((formula) => (
                  <button
                    key={formula.id}
                    type="button"
                    onClick={() => onOpenInReader?.(formula.name)}
                    className="rounded-md border-0 bg-surface-secondary/50 px-2 py-1 type-caption text-text-secondary hover:bg-surface-hover"
                  >
                    {formula.name.slice(0, 48)}{formula.name.length > 48 ? '…' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleChromeSection>
      </div>
    </div>
  );
}
