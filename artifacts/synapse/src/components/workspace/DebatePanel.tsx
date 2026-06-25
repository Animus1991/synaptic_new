import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from 'lucide-react';
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
          <p className="mb-2 text-[10px] text-text-muted" data-testid="debate-section-label">
            {isEl ? 'Ενότητα:' : 'Section:'}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && session.seedTree && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="debate-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
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
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={isEl ? 'Αναζήτηση επιχειρημάτων…' : 'Search claims…'}
              className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
              data-testid="debate-filter"
            />
          </div>
          <span className="text-[10px] text-text-muted">
            {session.nodeCount} {isEl ? 'κόμβοι' : 'nodes'}
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
              data-testid="debate-open-reader"
            >
              <BookOpen className="w-3 h-3" />
              Reader
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
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-accent-cyan hover:bg-accent-cyan/15"
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
            className="mt-3 rounded-xl border border-accent-cyan/20"
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
