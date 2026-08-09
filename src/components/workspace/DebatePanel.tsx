import { useMemo, useState } from 'react';
import { ArgumentMap } from './ArgumentMap';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import type { DebateSessionContent } from '../../lib/debateSessionModel';
import { collectDebateTexts, filterDebateTexts } from '../../lib/debateSessionModel';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import { useI18n } from '../../lib/i18n';

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
      <div className="p-3" data-testid="debate-panel-empty" data-bleed="full">
        <WorkspaceToolEmptyState
          tool="debate"
          concept={concept}
          message={emptyMessage}
          hasSource={false}
          onUpload={onUpload}
        />
      </div>
    );
  }

  if (!session.seedTree) {
    return (
      <div className="p-3" data-testid="debate-panel-empty" data-bleed="full">
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
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card"
      data-testid="debate-panel"
      data-bleed="full"
      data-clarity-pass="k158"
    >
      <div className="shrink-0 space-y-1.5 border-b border-transparent px-3 py-1.5">
        {session.sectionLabel && (
          <p className="type-caption text-text-muted" data-testid="debate-section-label">
            <span className="text-text-muted">{t('wsSectionLabel')}</span>
            <span className="ml-1.5 text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="debate-weak-extraction">
            {session.passageGrounded
              ? t('panelPassageGroundedDebate')
              : t('panelWeakExtractionDebate')}
          </WorkspacePanelWarnStrip>
        )}

        <CollapsibleChromeSection
          title={t('debateFindChrome')}
          alwaysCollapse
          data-testid="debate-filter-chrome"
        >
          <div
            className="flex flex-wrap items-center gap-2 px-3 pb-2"
            data-testid="debate-panel-toolbar"
          >
            <div className="min-w-[8rem] flex-1">
              <label className="sr-only" htmlFor="debate-filter-input">
                {t('panelSearchClaimsAria')}
              </label>
              <input
                id="debate-filter-input"
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('panelSearchClaims')}
                aria-label={t('panelSearchClaimsAria')}
                className="w-full min-h-8 rounded-md border-0 bg-surface-secondary/55 py-1.5 px-2.5 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                data-testid="debate-filter"
              />
            </div>
            <span className="type-caption tabular-nums text-text-muted">
              <span className="font-medium text-text-secondary">{session.nodeCount}</span>{' '}
              {t('panelNodes')}
            </span>
            {onOpenInReader && (
              <button
                type="button"
                onClick={() => onOpenInReader(concept)}
                className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                data-testid="debate-open-reader"
              >
                {t('panelReaderSource')}
              </button>
            )}
          </div>
        </CollapsibleChromeSection>

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid="debate-filter-matches">
            {filterMatches.slice(0, 6).map((text, i) => (
              <button
                key={`${i}-${text.slice(0, 24)}`}
                type="button"
                onClick={() => selectClaim(text)}
                className="rounded-md border-0 bg-surface-secondary/50 px-2 py-0.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
            className="rounded-md border-0 bg-surface-secondary/40"
            data-testid="debate-selection-actions"
          />
        )}
        {selectedClaim && onAiCounter && (
          <div>
            <button
              type="button"
              data-testid="debate-ai-counter"
              onClick={() => onAiCounter(selectedClaim)}
              className="rounded-md border-0 bg-surface-secondary/55 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('debateAiCounter')}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
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
