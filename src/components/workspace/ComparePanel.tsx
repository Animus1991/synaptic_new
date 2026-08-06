import { useMemo, useState } from 'react';
import { BookOpen, Search } from '@/lib/lucide-shim';
import { ComparisonTable } from '../visuals/DiagramGenerator';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { CompareSelectionParityStrip } from './CompareSelectionParityStrip';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { useI18n } from '../../lib/i18n';
import type { CompareRow, CompareSessionContent } from '../../lib/compareSessionModel';
import { filterCompareRows } from '../../lib/compareSessionModel';
import {
  auditCompareReaderSelectionParity,
  buildCompareRowText,
  buildCompareSelectionContext,
} from '../../lib/compareReaderSelectionParityQA';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';

type Props = {
  session: CompareSessionContent;
  concept: string;
  lang: 'en' | 'el';
  focusTerm?: string;
  emptyMessage?: string;
  onUpload?: () => void;
  onRowFocus?: (term: string) => void;
  onOpenInReader?: (query: string) => void;
  onAskAgent?: () => void;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  onExplainDifference?: (row: { term: string; text: string }) => void;
  /** OPT-AI-B — source-grounded compare micro-diff (may hand off to Agent). */
  onAiDiff?: (left: string, right: string) => void;
};

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
export function ComparePanel({
  session,
  concept,
  lang,
  focusTerm,
  emptyMessage,
  onUpload,
  onRowFocus,
  onOpenInReader,
  onAskAgent,
  onSelectionAction,
  onExplainDifference,
  onAiDiff,
}: Props) {
  const { t } = useI18n();
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<CompareRow | null>(null);

  const visibleRows = useMemo(
    () => filterCompareRows(session.rows, filterQuery),
    [session.rows, filterQuery],
  );

  const parityReport = useMemo(
    () => auditCompareReaderSelectionParity({
      lang,
      rows: session.rows,
      concept,
      sectionLabel: session.sectionLabel,
      selectionHandlerWired: Boolean(onSelectionAction),
    }),
    [lang, session.rows, session.sectionLabel, concept, onSelectionAction],
  );

  const ocrNoisyTerms = useMemo(
    () => new Set(parityReport.rows.filter((r) => r.ocrNoisy).map((r) => r.term)),
    [parityReport.rows],
  );

  const handleRowSelect = (term: string, rowText: string) => {
    if (onSelectionAction) {
      const row = visibleRows.find(
        (r) => r[0] === term && buildCompareRowText(r) === rowText,
      ) ?? visibleRows.find((r) => r[0] === term) ?? ([term, '', ''] as CompareRow);
      setSelectedRow(row);
      return;
    }
    onRowFocus?.(term);
  };

  const handleSelectionAction = (action: WorkspaceSelectionActionId) => {
    if (!selectedRow || !onSelectionAction) return;
    onSelectionAction(action, buildCompareSelectionContext(
      selectedRow,
      concept,
      session.sectionLabel,
    ));
    setSelectedRow(null);
  };

  if (!session.hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="compare"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.rows.length === 0) {
    return (
      <div className="p-3" data-testid="compare-panel-empty" data-bleed="full">
        <WorkspaceToolEmptyState
          tool="compare"
          concept={concept}
          message={emptyMessage}
          hasSource
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="compare-panel"
      data-bleed="full"
    >
      <div className="shrink-0 space-y-1.5 border-b border-border-subtle px-3 py-2">
        {session.sectionLabel && (
          <p className="type-caption text-text-muted" data-testid="compare-section-label">
            {t('compareSection')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="compare-weak-extraction">
            {session.passageGrounded ? t('comparePassageGrounded') : t('compareWeakExtraction')}
          </WorkspacePanelWarnStrip>
        )}

        {/* Wave CMP — parity only when something needs attention */}
        {!parityReport.ok && <CompareSelectionParityStrip report={parityReport} />}

        <CollapsibleChromeSection
          title={t('compareFilterPlaceholder')}
          alwaysCollapse
          data-testid="compare-filter-chrome"
        >
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <div className="relative min-w-[8rem] flex-1">
              <label className="sr-only" htmlFor="compare-filter-input">
                {t('compareFilterPlaceholder')}
              </label>
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden />
              <input
                id="compare-filter-input"
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('compareFilterPlaceholder')}
                className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 type-caption text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                data-testid="compare-filter"
              />
            </div>
            <span className="type-caption tabular-nums text-text-muted">
              {visibleRows.length}/{session.rows.length} {t('compareRows')}
            </span>
            {onOpenInReader && (
              <button
                type="button"
                onClick={() => onOpenInReader(concept)}
                className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle px-2.5 type-caption text-text-secondary hover:border-border-default hover:text-text-primary"
                data-testid="compare-open-reader"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                {t('cognitiveReader')}
              </button>
            )}
          </div>
        </CollapsibleChromeSection>
      </div>

      {selectedRow && onExplainDifference && (
        <button
          type="button"
          data-testid="compare-explain-difference"
          onClick={() => onExplainDifference({
            term: selectedRow[0],
            text: buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text,
          })}
          className="mx-3 mt-2 inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-1.5 type-caption font-medium text-text-secondary hover:border-border-default hover:text-text-primary"
        >
          {t('compareExplainDiff')}
        </button>
      )}

      {selectedRow && onSelectionAction && (
        <WorkspaceSelectionActionBar
          lang={lang}
          excerpt={buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text}
          originTool="compare"
          onAction={handleSelectionAction}
          onDismiss={() => setSelectedRow(null)}
          className="mx-3 mt-2 rounded-xl border border-border-subtle"
          data-testid="compare-selection-actions"
        />
      )}

      {selectedRow && ocrNoisyTerms.has(selectedRow[0]) && (
        <p
          className="mx-3 mt-2 type-caption text-accent-amber"
          data-testid="compare-row-ocr-warning"
        >
          {t('compareOcrWarning')}
        </p>
      )}

      {selectedRow && onAiDiff && (
        <div className="mx-3 mt-2">
          <button
            type="button"
            data-testid="compare-ai-diff"
            onClick={() => onAiDiff(selectedRow[0], selectedRow[1] || concept)}
            className="rounded-lg border border-border-subtle bg-surface-secondary px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover"
          >
            {t('compareAiDiff')}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleRows.length === 0 ? (
          <p className="px-3 py-3 type-caption text-text-muted">
            {t('compareNoFilterMatch')}
          </p>
        ) : (
          <ComparisonTable
            title={concept}
            headers={[...session.headers]}
            items={visibleRows}
            concept={concept}
            lang={lang}
            focusTerm={focusTerm ?? concept}
            onRowSelect={onSelectionAction ? handleRowSelect : undefined}
            onRowFocus={onSelectionAction ? undefined : onRowFocus}
            selectedTerm={selectedRow?.[0]}
            onAskAgent={onAskAgent}
          />
        )}
      </div>
    </div>
  );
}
