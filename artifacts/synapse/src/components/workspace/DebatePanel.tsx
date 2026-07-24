import { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, BookOpen, Search, Sparkles, Loader2, X } from '@/lib/lucide-shim';
import { chatCompletion } from '../../lib/llmClient';
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
  const { t } = useI18n();
  const [aiCounter, setAiCounter] = useState<string | null>(null);
  const [aiCounterLoading, setAiCounterLoading] = useState(false);
  const [aiCounterClaim, setAiCounterClaim] = useState<string | null>(null);
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

  const generateAiCounter = useCallback(async (claim: string) => {
    if (aiCounterLoading) return;
    setAiCounterLoading(true);
    setAiCounter(null);
    setAiCounterClaim(claim);
    try {
      const source = session.sourceExcerpt?.slice(0, 900) ?? '';
      const counter = await chatCompletion(
        [
          {
            role: 'system',
            content: isEl
              ? 'Είσαι critical thinking coach. Δώσε ένα ακαδημαϊκό, grounded counter-argument στον ισχυρισμό. Χρησιμοποίησε τις σημειώσεις αν παρέχονται. 3-4 προτάσεις, χωρίς να είσαι απλώς αντίθετος — ψάξε nuance.'
              : 'You are a critical thinking coach. Provide a well-reasoned academic counter-argument to the claim. Use the source notes if provided. 3-4 sentences — seek nuance, not mere opposition.',
          },
          {
            role: 'user',
            content: `Claim: "${claim}"\nConcept: ${concept}${source ? `\nSource notes:\n${source}` : ''}`,
          },
        ],
        undefined,
      );
      setAiCounter(counter);
    } catch {
      setAiCounter(isEl ? 'Σφάλμα AI — δοκίμασε ξανά.' : 'AI error — try again.');
    } finally {
      setAiCounterLoading(false);
    }
  }, [aiCounterLoading, concept, isEl, session.sourceExcerpt]);

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
                ? t('panelPassageGroundedDebate')
                : t('panelWeakExtractionDebate')}
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
              placeholder={t('panelSearchClaims')}
              aria-label={t('panelSearchClaimsAria')}
              className="w-full rounded-md border border-border-subtle bg-surface-card py-1.5 pl-8 pr-2 text-[12px] text-text-secondary placeholder:text-text-muted focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
              data-testid="debate-filter"
            />
          </div>
          <span className="ws-eyebrow text-text-muted">
            <span className="ws-num">{session.nodeCount}</span> <AllCapsLabel>{t('panelNodes')}</AllCapsLabel>
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-text-secondary hover:border-brand-400/40 hover:text-brand-800 transition-colors"
              data-testid="debate-open-reader"
            >
              <BookOpen className="w-3 h-3" aria-hidden />
              <AllCapsLabel>{t('panelReaderSource')}</AllCapsLabel>
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
            onDismiss={() => { setSelectedClaim(null); setAiCounter(null); setAiCounterClaim(null); }}
            className="mt-3 rounded-md border border-brand-500/25"
            data-testid="debate-selection-actions"
          />
        )}

        {/* AI Counter-argument — shown for any selected/clicked claim */}
        {(selectedClaim || aiCounterClaim) && (
          <div className="mt-3 space-y-2" data-testid="debate-ai-counter-area">
            <button
              type="button"
              data-testid="debate-ai-counter-btn"
              onClick={() => void generateAiCounter(selectedClaim ?? aiCounterClaim ?? '')}
              disabled={aiCounterLoading || !(selectedClaim ?? aiCounterClaim)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/8 px-3 py-1.5 text-[10px] font-medium text-brand-300 hover:bg-brand-500/15 disabled:opacity-50 transition-colors"
            >
              {aiCounterLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" />{isEl ? 'Φορτώνει…' : 'Generating…'}</>
                : <><Sparkles className="w-3 h-3" />{isEl ? 'AI Αντεπιχείρημα' : 'AI Counter-argument'}</>
              }
            </button>

            {aiCounter && (
              <div
                data-testid="debate-ai-counter-result"
                className="rounded-xl border border-brand-500/20 bg-brand-500/6 px-3 py-2.5 text-[10px] text-text-secondary leading-relaxed"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 text-brand-300 font-semibold text-[10px]">
                    <Sparkles className="w-3 h-3" />
                    {isEl ? 'AI Αντεπιχείρημα' : 'AI Counter-argument'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAiCounter(null); setAiCounterClaim(null); }}
                    className="rounded p-0.5 text-text-muted hover:text-text-primary"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="italic text-[9px] text-text-muted mb-1.5 truncate">
                  "{(aiCounterClaim ?? '').slice(0, 80)}{(aiCounterClaim ?? '').length > 80 ? '…' : ''}"
                </p>
                {aiCounter}
              </div>
            )}
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
