import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from '@/lib/lucide-shim';
import { ArgumentMap } from './ArgumentMap';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { DebateSessionContent } from '../../lib/debateSessionModel';
import { collectDebateTexts, filterDebateTexts } from '../../lib/debateSessionModel';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

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
  /** OPT-AI-B — generate / hand off a counter-argument for the selected claim. */
  onAiCounter?: (claimText: string) => void;
};

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
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
  onAiCounter,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const { t } = useI18n();

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
      <WorkspaceToolEmptyState
        tool="debate"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (!session.seedTree) {
    return (
      <div className="p-4" data-testid="debate-panel-empty">
        <WorkspaceToolEmptyState
          tool="debate"
          concept={concept}
          message={emptyMessage}
          hasSource
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="debate-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 ws-eyebrow text-text-muted" data-testid="debate-section-label">
            <span><AllCapsLabel>{t('wsSectionLabel')}</AllCapsLabel></span>
            <span className="ml-2 normal-case tracking-normal text-text-secondary font-sans type-caption">
              {session.sectionLabel}
            </span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && session.seedTree && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border-l-2 border-l-accent-amber/60 border-y border-r border-border-subtle bg-accent-amber/5 px-3 py-2 type-caption text-accent-amber"
            data-testid="debate-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {session.passageGrounded
                ? t('panelPassageGroundedDebate')
                : t('panelWeakExtractionDebate')}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2" data-testid="debate-panel-toolbar">
          <div className="relative min-w-[140px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t('panelSearchClaims')}
              aria-label={t('panelSearchClaimsAria')}
              className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-8 pr-2 type-caption text-text-secondary placeholder:text-text-muted focus:border-border-default focus:outline-none"
              data-testid="debate-filter"
            />
          </div>
          <span className="type-caption text-text-secondary">
            <span className="font-semibold">{session.nodeCount}</span> {t('panelNodes')}
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-touch-floor inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1 type-caption text-text-secondary hover:border-border-default hover:text-text-primary"
              data-testid="debate-open-reader"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t('panelReaderSource')}
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
                className="rounded-md border border-brand-500/25 bg-brand-500/5 px-2 py-0.5 type-caption text-text-secondary hover:bg-brand-500/10 hover:border-brand-500/40 transition-colors"
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
        {selectedClaim && onAiCounter && (
          <div className="mt-2">
            <button
              type="button"
              data-testid="debate-ai-counter"
              onClick={() => onAiCounter(selectedClaim)}
              className="rounded-full border border-border-default bg-surface-tertiary px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('debateAiCounter')}
            </button>
          </div>
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
