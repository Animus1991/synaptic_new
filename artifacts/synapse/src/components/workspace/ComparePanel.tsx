import { useMemo, useState, useCallback, useEffect } from 'react';
import { BookOpen, Search, AlertTriangle, Sparkles, Loader2, X } from '@/lib/lucide-shim';
import { ComparisonTable } from '../visuals/DiagramGenerator';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { CompareSelectionParityStrip } from './CompareSelectionParityStrip';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
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
import { chatCompletion } from '../../lib/llmClient';
import { buildCompareDifferencePrompt } from '../../lib/compareExplainDifference';

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
};

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
}: Props) {
  const { t } = useI18n();
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<CompareRow | null>(null);
  const [aiDiffResult, setAiDiffResult] = useState<string | null>(null);
  const [aiDiffLoading, setAiDiffLoading] = useState(false);
  const isEl = lang === 'el';

  useEffect(() => { setAiDiffResult(null); }, [selectedRow]);

  const generateAiDiff = useCallback(async () => {
    if (!selectedRow) return;
    const rowText = buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text;
    const prompt = buildCompareDifferencePrompt(rowText, concept, lang);
    setAiDiffLoading(true);
    setAiDiffResult(null);
    try {
      const result = await chatCompletion([{ role: 'user', content: prompt }], undefined);
      setAiDiffResult(result);
    } finally {
      setAiDiffLoading(false);
    }
  }, [selectedRow, concept, lang, session.sectionLabel]);

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
      <div className="p-4" data-testid="compare-panel-empty">
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
    <div className="flex h-full flex-col overflow-hidden p-4" data-testid="compare-panel">
      {session.sectionLabel && (
        <p className="mb-2 text-[10px] text-text-muted" data-testid="compare-section-label">
          {t('compareSection')}{' '}
          <span className="text-text-secondary">{session.sectionLabel}</span>
        </p>
      )}

      {(session.weakExtraction || session.passageGrounded) && (
        <WorkspacePanelWarnStrip testId="compare-weak-extraction">
          {session.passageGrounded ? t('comparePassageGrounded') : t('compareWeakExtraction')}
        </WorkspacePanelWarnStrip>
      )}

      <CompareSelectionParityStrip report={parityReport} />

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('compareFilterPlaceholder')}
            className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="compare-filter"
          />
        </div>
        <span className="text-[10px] text-text-muted">
          {visibleRows.length}/{session.rows.length} {t('compareRows')}
        </span>
        {onOpenInReader && (
          <button
            type="button"
            onClick={() => onOpenInReader(concept)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
            data-testid="compare-open-reader"
          >
            <BookOpen className="w-3 h-3" />
            {t('cognitiveReader')}
          </button>
        )}
      </div>

      {selectedRow && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="compare-explain-difference-ai"
            onClick={generateAiDiff}
            disabled={aiDiffLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-[10px] font-medium text-brand-300 hover:bg-brand-500/15 disabled:opacity-50"
          >
            {aiDiffLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isEl ? 'AI Εξήγηση' : 'AI Explain'}
          </button>
          {onExplainDifference && (
            <button
              type="button"
              data-testid="compare-explain-difference"
              onClick={() => onExplainDifference({
                term: selectedRow[0],
                text: buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text,
              })}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-[10px] font-medium text-brand-800 hover:opacity-90"
            >
              {t('compareExplainDiff')}
            </button>
          )}
        </div>
      )}

      {aiDiffResult && (
        <div className="mb-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3" data-testid="compare-ai-diff-result">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[10px] font-semibold text-brand-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isEl ? 'AI Εξήγηση Διαφοράς' : 'AI Difference Explanation'}
            </p>
            <button type="button" onClick={() => setAiDiffResult(null)} className="text-text-muted hover:text-text-secondary">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">{aiDiffResult}</p>
        </div>
      )}

      {selectedRow && onSelectionAction && (
        <WorkspaceSelectionActionBar
          lang={lang}
          excerpt={buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text}
          originTool="compare"
          onAction={handleSelectionAction}
          onDismiss={() => setSelectedRow(null)}
          className="mb-3 rounded-xl border border-accent-cyan/20"
          data-testid="compare-selection-actions"
        />
      )}

      {selectedRow && ocrNoisyTerms.has(selectedRow[0]) && (
        <p
          className="mb-2 text-[10px] text-accent-amber px-1"
          data-testid="compare-row-ocr-warning"
        >
          {t('compareOcrWarning')}
        </p>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleRows.length === 0 ? (
          <p className="text-[11px] text-text-muted px-1">
            {t('compareNoFilterMatch')}
          </p>
        ) : (
          <ComparisonTable
            title={`${t('compare')}: ${concept}`}
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
