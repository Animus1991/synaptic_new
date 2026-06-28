import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from '@/lib/lucide-shim';
import { ArgumentMap } from './ArgumentMap';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { DebateSessionContent } from '../../lib/debateSessionModel';
import { collectDebateTexts, filterDebateTexts } from '../../lib/debateSessionModel';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';

type Props = {
  session: DebateSessionContent;
  concept: string;
  lang: 'en' | 'el';
  storageScope: string;
  focusTerm?: string;
  emptyMessage?: string;
  onUpload?: () => void;
  onOpenInReader?: (claimText: string) => void;
  onAskAgent?: (claimText?: string) => void;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  onRebuttalPersisted?: (rebuttalText: string) => void;
};

export function DebatePanel({
  session,
  concept,
  lang,
  storageScope,
  focusTerm,
  emptyMessage,
  onUpload,
  onOpenInReader,
  onAskAgent,
  onSelectionAction,
  onRebuttalPersisted,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const isEl = lang === 'el';

  const filterMatches = useMemo(() => {
    if (!session.seedTree || !filterQuery.trim()) return [];
    const texts = collectDebateTexts(session.seedTree);
    return filterDebateTexts(texts, filterQuery);
  }, [session.seedTree, filterQuery]);

  const handleSelectionAction = (action: WorkspaceSelectionActionId) => {
    if (!selectedClaim || !onSelectionAction) return;
    onSelectionAction(action, {
      text: selectedClaim,
      term: selectedClaim.slice(0, 80) || concept,
      sectionLabel: session.sectionLabel,
      originTool: 'debate',
    });
    setSelectedClaim(null);
  };

  const selectClaim = (text: string) => {
    if (onSelectionAction) {
      setSelectedClaim(text);
      return;
    }
    onOpenInReader?.(text);
  };

  if (!session.hasSource) {
    return (
      <WorkspaceEmptyState
        tool="debate"
        message={emptyMessage ?? (isEl ? 'Ανέβασε σημειώσεις για συζήτηση.' : 'Upload notes to debate.')}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="debate-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 ws-eyebrow text-text-muted" data-testid="debate-section-label">
            <span>{isEl ? 'Ενότητα' : 'Section'}</span>
            <span className="ml-2 normal-case tracking-normal text-text-secondary font-sans text-[11px]">
              {session.sectionLabel}
            </span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && session.seedTree && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border-l-2 border-accent-amber/60 border-y border-r border-border-subtle bg-accent-amber/5 px-3 py-2 text-[11px] text-accent-amber"
            data-testid="debate-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {session.passageGrounded
                ? (isEl
                  ? 'Το δέντρο επιχειρημάτων προέρχεται από το απόσπασμα (generic concept) — Reprocess για πιο πλούσια δομή.'
                  : 'Argument tree is passage-grounded (generic concept) — Reprocess for richer structure.')
                : (isEl
                  ? 'Αδύναμη εξαγωγή — δοκίμασε Reprocess ή ξεκίνα χειροκίνητα.'
                  : 'Weak extraction — try Reprocess or start manually.')}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" aria-hidden />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={isEl ? 'Αναζήτηση επιχειρημάτων…' : 'Search claims…'}
              aria-label={isEl ? 'Αναζήτηση επιχειρημάτων' : 'Search claims'}
              className="w-full rounded-md border border-border-subtle bg-surface-card py-1.5 pl-8 pr-2 text-[12px] text-text-secondary placeholder:text-text-muted focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
              data-testid="debate-filter"
            />
          </div>
          <span className="ws-eyebrow text-text-muted">
            <span className="ws-num">{session.nodeCount}</span> {isEl ? 'κόμβοι' : 'nodes'}
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-text-secondary hover:border-brand-400/40 hover:text-brand-800 transition-colors"
              data-testid="debate-open-reader"
            >
              <BookOpen className="w-3 h-3" aria-hidden />
              {isEl ? 'Πηγή' : 'Reader'}
            </button>
          )}
        </div>

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="debate-filter-matches">
            {filterMatches.slice(0, 6).map((text, i) => (
              <button
                key={`${i}-${text.slice(0, 24)}`}
                type="button"
                onClick={() => selectClaim(text)}
                className="rounded-md border border-brand-500/25 bg-brand-500/5 px-2 py-0.5 text-[10px] text-brand-200 hover:bg-brand-500/10 hover:border-brand-500/40 transition-colors"
              >
                {text.slice(0, 56)}{text.length > 56 ? '…' : ''}
              </button>
            ))}
          </div>
        )}

        {selectedClaim && onSelectionAction && (
          <WorkspaceSelectionActionBar
            lang={lang}
            excerpt={selectedClaim}
            originTool="debate"
            onAction={handleSelectionAction}
            onDismiss={() => setSelectedClaim(null)}
            className="mt-3 rounded-md border border-brand-500/25"
            data-testid="debate-selection-actions"
          />
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ArgumentMap
          tree={session.seedTree}
          storageKey={`debate-${storageScope}`}
          concept={concept}
          emptyMessage={emptyMessage}
          hasSource={session.hasSource}
          onUpload={onUpload}
          sourceText={session.sourceExcerpt}
          focusTerm={focusTerm ?? concept}
          lang={lang}
          onOpenInReader={onOpenInReader}
          onAskAgent={onAskAgent}
          onNodeSelect={onSelectionAction ? (text) => setSelectedClaim(text) : undefined}
          selectedClaim={selectedClaim}
          onRebuttalPersisted={onRebuttalPersisted}
        />
      </div>
    </div>
  );
}
