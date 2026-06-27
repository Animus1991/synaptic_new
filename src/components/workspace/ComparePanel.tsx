import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from '@/lib/lucide-shim';
import { ComparisonTable } from '../visuals/DiagramGenerator';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { CompareSelectionParityStrip } from './CompareSelectionParityStrip';
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
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<CompareRow | null>(null);
  const isEl = lang === 'el';

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
      <WorkspaceEmptyState
        message={emptyMessage ?? (isEl ? 'Ανέβασε σημειώσεις για σύγκριση.' : 'Upload notes to compare.')}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.rows.length === 0) {
    return (
      <div className="p-4" data-testid="compare-panel-empty">
        <WorkspaceEmptyState
          message={emptyMessage ?? (isEl
            ? 'Δεν βρέθηκαν συγκρίσεις στο υλικό — δοκίμασε Reprocess ή ανέβασε πιο δομημένες σημειώσεις.'
            : 'No comparisons found in your material — try Reprocess or upload more structured notes.')}
          hasSource
          onUpload={onUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4" data-testid="compare-panel">
      {session.sectionLabel && (
        <p className="mb-2 text-[10px] text-text-muted" data-testid="compare-section-label">
          {isEl ? 'Ενότητα:' : 'Section:'}{' '}
          <span className="text-text-secondary">{session.sectionLabel}</span>
        </p>
      )}

      {(session.weakExtraction || session.passageGrounded) && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
          data-testid="compare-weak-extraction"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            {session.passageGrounded
              ? (isEl
                ? 'Οι συγκρίσεις προέρχονται από το απόσπασμα (generic concept) — Reprocess για πιο πλούσια δομή.'
                : 'Comparisons are passage-grounded (generic concept) — Reprocess for richer structure.')
              : (isEl
                ? 'Αδύναμη εξαγωγή — λίγοι όροι γλωσσαρίου. Δοκίμασε Reprocess.'
                : 'Weak extraction — sparse glossary. Try Reprocess.')}
          </p>
        </div>
      )}

      <CompareSelectionParityStrip report={parityReport} lang={lang} />

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={isEl ? 'Φίλτρο σειρών…' : 'Filter rows…'}
            className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="compare-filter"
          />
        </div>
        <span className="text-[10px] text-text-muted">
          {visibleRows.length}/{session.rows.length} {isEl ? 'σειρές' : 'rows'}
        </span>
        {onOpenInReader && (
          <button
            type="button"
            onClick={() => onOpenInReader(concept)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
            data-testid="compare-open-reader"
          >
            <BookOpen className="w-3 h-3" />
            Reader
          </button>
        )}
      </div>

      {selectedRow && onExplainDifference && (
        <button
          type="button"
          data-testid="compare-explain-difference"
          onClick={() => onExplainDifference({
            term: selectedRow[0],
            text: buildCompareSelectionContext(selectedRow, concept, session.sectionLabel).text,
          })}
          className="mb-2 inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
        >
          {isEl ? 'Εξήγησε τη διαφορά (Agent)' : 'Explain difference (Agent)'}
        </button>
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
          className="mb-2 text-[9px] text-accent-amber px-1"
          data-testid="compare-row-ocr-warning"
        >
          {isEl
            ? 'Πιθανό OCR noise — επαλήθευσε στο Reader πριν χρησιμοποιήσεις τη σειρά.'
            : 'Possible OCR noise — verify in Reader before using this row.'}
        </p>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleRows.length === 0 ? (
          <p className="text-[11px] text-text-muted px-1">
            {isEl ? 'Καμία σειρά δεν ταιριάζει στο φίλτρο.' : 'No rows match the filter.'}
          </p>
        ) : (
          <ComparisonTable
            title={`${isEl ? 'Σύγκριση' : 'Compare'}: ${concept}`}
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
