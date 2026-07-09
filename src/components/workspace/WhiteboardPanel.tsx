import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from '@/lib/lucide-shim';
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
import { useI18n } from '../../lib/i18n';

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
};

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
    <div className="flex h-full flex-col overflow-hidden" data-testid="whiteboard-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 ws-eyebrow text-text-muted" data-testid="whiteboard-section-label">
            <span>{t('wsSectionLabel')}</span>
            <span className="ml-2 normal-case tracking-normal text-text-secondary font-sans text-[11px]">
              {session.sectionLabel}
            </span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border-l-2 border-accent-amber/60 border-y border-r border-border-subtle bg-accent-amber/5 px-3 py-2 text-[11px] text-accent-amber"
            data-testid="whiteboard-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {session.passageGrounded
                ? t('panelPassageGroundedWhiteboard')
                : t('panelWeakExtractionWhiteboard')}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {session.formulas.length > 0 && (
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" aria-hidden />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('panelSearchFormulas')}
                aria-label={t('panelSearchFormulasAria')}
                className="w-full rounded-md border border-border-subtle bg-surface-card py-1.5 pl-8 pr-2 text-[12px] text-text-secondary placeholder:text-text-muted focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
                data-testid="whiteboard-filter"
              />
            </div>
          )}
          <span className="ws-eyebrow text-text-muted">
            <span className="ws-num">{session.formulas.length}</span> {t('panelFormulas')}
            {session.stampCount > 0 && (
              <> · <span className="ws-num">{session.stampCount}</span> LaTeX</>
            )}
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-text-secondary hover:border-brand-400/40 hover:text-brand-800 transition-colors"
              data-testid="whiteboard-open-reader"
            >
              <BookOpen className="w-3 h-3" aria-hidden />
              {t('panelReaderSource')}
            </button>
          )}
        </div>

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="whiteboard-filter-matches">
            {filterMatches.slice(0, 6).map((formula) => (
              <button
                key={formula.id}
                type="button"
                onClick={() => onOpenInReader?.(formula.name)}
                className="rounded-md border border-brand-500/25 bg-brand-500/5 px-2 py-0.5 text-[10px] text-brand-200 hover:bg-brand-500/10 hover:border-brand-500/40 transition-colors"
              >
                {formula.name.slice(0, 48)}{formula.name.length > 48 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <WhiteboardDiagramCoach
        plan={coachPlan}
        coverageReport={blueprintCoverage}
        lang={lang}
        onInsertLabels={handleInsertLabels}
        onAskAgent={handleCoachAskAgent}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
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
        />
      </div>
    </div>
  );
}
