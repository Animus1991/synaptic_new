import { ChevronDown, ChevronUp, GitBranch, AlertTriangle, CheckCircle2 } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ConceptBusRow } from '../../lib/conceptBusPanelModel';
import {
  buildConceptRemediationMatrix,
  type ConceptRemediationId,
} from '../../lib/conceptBusRemediation';
import type { ConceptLensView } from '../../lib/conceptGraphModel';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { useI18n } from '../../lib/i18n';
import {
  CONCEPT_SIGNAL_SHORT_LABELS,
  WORKSPACE_TOOL_SHORT_LABELS,
} from '../../lib/workspaceConceptPanelLabels';

const TOOL_LABELS = WORKSPACE_TOOL_SHORT_LABELS;
const SIGNAL_LABELS = CONCEPT_SIGNAL_SHORT_LABELS;

type Props = {
  rows: ConceptBusRow[];
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  expanded: boolean;
  onToggle: () => void;
  onFocusTerm: (term: string) => void;
  onJumpTool: (tool: WorkspaceToolId) => void;
  onRemediate?: (concept: string, action: ConceptRemediationId) => void;
  /** Active concept lens metadata for expanded detail rows. */
  activeLens?: ConceptLensView;
  onOpenReaderSection?: () => void;
  hasSource?: boolean;
  onUpload?: () => void;
  onReprocess?: () => void;
};

export function ConceptBusPanel({
  rows,
  activeTool,
  lang,
  expanded,
  onToggle,
  onFocusTerm,
  onJumpTool,
  onRemediate,
  activeLens,
  onOpenReaderSection,
  hasSource = false,
  onUpload,
  onReprocess,
}: Props) {
  const { t } = useI18n();
  const engagedCount = rows.length;

  return (
    <div
      className="shrink-0 border-b border-brand-500/20 bg-gradient-to-r from-brand-600/6 via-transparent to-accent-violet/6"
      data-testid="concept-bus-panel"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-brand-700 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-primary truncate">
              {t('busTitle')}
            </p>
            <p className="text-[10px] text-text-tertiary truncate">
              {engagedCount === 0
                ? (t('busNoActivity'))
                : (t('busTermsActive').replace('{count}', String(engagedCount)))}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
      </button>

      {rows.length === 0 && (
        <div className="px-3 pb-3" data-testid="concept-bus-empty">
          <p className="text-[10px] text-text-tertiary">
            {t('busEmptyHint')}
          </p>
          {activeLens?.emptyReason === 'weak-extraction' && (
            <p className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ws-chip-warn">
              {t('busWeakExtraction')}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!hasSource && onUpload && (
              <button
                type="button"
                onClick={onUpload}
                className="ws-empty-cta-primary text-[10px] px-2.5 py-1"
                data-testid="concept-bus-empty-upload"
              >
                {t('busUploadMaterial')}
              </button>
            )}
            {hasSource && (
              <>
                <button
                  type="button"
                  onClick={() => onJumpTool('reader')}
                  className="ws-empty-cta-primary text-[10px] px-2.5 py-1"
                  data-testid="concept-bus-empty-reader"
                >
                  {t('panelOpenReader')}
                </button>
                <button
                  type="button"
                  onClick={() => onJumpTool('quiz')}
                  className="ws-empty-cta-secondary text-[10px] px-2.5 py-1"
                  data-testid="concept-bus-empty-quiz"
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={() => onJumpTool('feynman')}
                  className="ws-empty-cta-secondary text-[10px] px-2.5 py-1"
                  data-testid="concept-bus-empty-feynman"
                >
                  Feynman
                </button>
              </>
            )}
            {hasSource && onReprocess && (
              <button
                type="button"
                onClick={onReprocess}
                className="ws-empty-cta-secondary text-[10px] px-2.5 py-1"
                data-testid="concept-bus-empty-reprocess"
              >
                {t('busReprocessMaterial')}
              </button>
            )}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="px-3 pb-2 overflow-x-auto" data-testid="concept-bus-correlation">
          <div className="flex gap-2 min-w-max">
            {rows.slice(0, expanded ? 12 : 4).map((row) => (
              <ConceptBusChip
                key={row.key}
                row={row}
                activeTool={activeTool}
                lang={lang}
                onFocus={() => onFocusTerm(row.concept)}
                onJumpTool={onJumpTool}
              />
            ))}
          </div>
        </div>
      )}

      {expanded && rows.length > 0 && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/6 pt-2 max-h-48 overflow-y-auto">
          {activeLens && activeLens.activeConcept && (
            <div className="rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 px-2.5 py-2 mb-2" data-testid="concept-bus-active-lens">
              <p className="text-[10px] font-semibold text-brand-800 truncate">{activeLens.activeConcept}</p>
              {(activeLens.prerequisites.length > 0 || activeLens.related.length > 0) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {activeLens.prerequisites.slice(0, 2).map((r) => (
                    <button
                      key={`pre-${r.label}`}
                      type="button"
                      onClick={() => onFocusTerm(r.label)}
                      className="rounded px-1.5 py-0.5 text-[8px] border border-white/10 text-text-muted hover:text-brand-800"
                    >
                      ← {r.label}
                    </button>
                  ))}
                  {activeLens.related.slice(0, 2).map((r) => (
                    <button
                      key={`rel-${r.label}`}
                      type="button"
                      onClick={() => onFocusTerm(r.label)}
                      className="rounded px-1.5 py-0.5 text-[8px] border border-white/10 text-text-muted hover:text-brand-800"
                    >
                      ~ {r.label}
                    </button>
                  ))}
                </div>
              )}
              {activeLens.sourceSections[0] && onOpenReaderSection && (
                <button
                  type="button"
                  onClick={onOpenReaderSection}
                  className="mt-1 text-[9px] text-brand-800 hover:underline"
                  data-testid="concept-bus-reader-link"
                >
                  {t('busOpenInReader')} · {activeLens.sourceSections[0]}
                </button>
              )}
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.key}
              className={cn(
                'rounded-xl border px-2.5 py-2',
                row.isFocus ? 'border-accent-cyan/40 bg-accent-cyan/8' : 'border-white/8 bg-white/[0.03]',
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onFocusTerm(row.concept)}
                  className="text-[11px] font-semibold text-text-primary hover:text-brand-800 truncate max-w-[200px]"
                >
                  {row.concept}
                </button>
                <div className="flex items-center gap-1">
                  {row.struggling && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-accent-amber">
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                  {row.confident && !row.struggling && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-accent-emerald">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                  <span className="text-[9px] text-text-muted font-mono">
                    {Math.round(row.engagement * 100)}%
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {row.tools.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => onJumpTool(tool)}
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                      tool === activeTool
                        ? 'border-brand-500/50 bg-brand-500/15 text-brand-800'
                        : 'border-white/10 bg-white/[0.04] text-text-secondary hover:border-brand-600/35 hover:text-brand-800',
                    )}
                  >
                    {TOOL_LABELS[tool][lang]}
                  </button>
                ))}
              </div>
              {row.signals.length > 0 && (
                <p className="mt-1 text-[9px] text-text-muted truncate">
                  {row.signals.map((s) => SIGNAL_LABELS[s][lang]).join(' → ')}
                </p>
              )}
              {onRemediate && (row.struggling || row.signals.some((s) => s === 'quiz-wrong' || s === 'leitner-hard' || s === 'annotated-confusing')) && (
                <div className="mt-1.5 flex flex-wrap gap-1" data-testid={`concept-bus-remediation-${row.key}`}>
                  <span className="w-full text-[8px] font-medium text-text-muted">
                    {t('busNextStep')}
                  </span>
                  {buildConceptRemediationMatrix(row, lang).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      title={action.hint}
                      onClick={() => onRemediate(row.concept, action.id)}
                      className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-amber hover:bg-accent-amber/20 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptBusChip({
  row,
  activeTool,
  lang,
  onFocus,
  onJumpTool,
}: {
  row: ConceptBusRow;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  onFocus: () => void;
  onJumpTool: (tool: WorkspaceToolId) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-2 py-1.5 min-w-[120px] max-w-[160px]',
        row.isFocus ? 'border-accent-cyan/40 bg-accent-cyan/10' : 'border-white/10 bg-surface-card/60',
      )}
    >
      <button type="button" onClick={onFocus} className="text-[10px] font-semibold text-text-primary truncate block w-full text-left">
        {row.concept}
      </button>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {row.tools.slice(0, 4).map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => onJumpTool(tool)}
            className={cn(
              'rounded px-1 py-0.5 text-[8px] font-medium',
              tool === activeTool ? 'bg-brand-500/20 text-brand-800' : 'bg-white/6 text-text-muted hover:text-brand-800',
            )}
          >
            {TOOL_LABELS[tool][lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
