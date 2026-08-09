import { useMemo, useState } from 'react';
import { Search } from '@/lib/lucide-shim';
import type { FsrsRating } from '../../lib/pedagogy';
import type { SpacingData } from '../../types';
import type { LeitnerSessionContent } from '../../lib/leitnerSessionModel';
import { filterLeitnerCards, filterLeitnerCardsByType } from '../../lib/leitnerSessionModel';
import {
  countLeitnerCardsByType,
  LEITNER_CARD_TYPES,
  leitnerCardTypeLabel,
  type LeitnerCardType,
} from '../../lib/leitnerCardTypes';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { LeitnerBox } from './LeitnerBox';
import { LeitnerStaleArtifactBanner } from './LeitnerStaleArtifactBanner';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { useI18n } from '../../lib/i18n';

type Props = {
  session: LeitnerSessionContent;
  concept: string;
  lang: 'en' | 'el';
  scopeKey: string;
  spacingIntervals?: SpacingData[];
  emptyMessage?: string;
  onUpload?: () => void;
  onRate?: (rating: FsrsRating) => void;
  onOpenQuiz?: () => void;
  onQuizCard?: (front: string) => void;
  onOpenInReader?: (query: string) => void;
  onSessionDirty?: () => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
};

/* Wave FC — card-first Flashcards; warm chrome; filters demoted */
export function LeitnerPanel({
  session,
  concept,
  lang,
  scopeKey,
  spacingIntervals = [],
  emptyMessage,
  onUpload,
  onRate,
  onOpenQuiz,
  onQuizCard,
  onOpenInReader,
  onSessionDirty,
  artifactStale = false,
  onAcknowledgeStale,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LeitnerCardType | 'all'>('all');
  const [interleaved, setInterleaved] = useState(false);
  const { t } = useI18n();

  const typeCounts = useMemo(
    () => countLeitnerCardsByType(session.cards),
    [session.cards],
  );

  const visibleCards = useMemo(() => {
    const byType = filterLeitnerCardsByType(session.cards, typeFilter);
    return filterLeitnerCards(byType, filterQuery);
  }, [session.cards, typeFilter, filterQuery]);

  const filterMatches = useMemo(
    () => filterLeitnerCards(session.cards, filterQuery),
    [session.cards, filterQuery],
  );

  if (!session.hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="leitner"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.cards.length === 0) {
    return (
      <div className="p-4" data-testid="leitner-panel-empty">
        <WorkspaceToolEmptyState
          tool="leitner"
          concept={concept}
          message={emptyMessage}
          hasSource
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="leitner-panel" data-clarity-pass="k162">
      <div className="shrink-0 border-b border-transparent">
        {/* OPT-K160 — meta strip only; filters wash; no decorative warn icon */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-2 pb-1">
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {session.sectionLabel && (
              <p className="type-caption text-text-muted" data-testid="leitner-section-label">
                {t('wsSectionColon')}{' '}
                <span className="font-medium text-text-secondary">{session.sectionLabel}</span>
              </p>
            )}
            <span className="type-caption tabular-nums text-text-secondary" data-testid="leitner-card-count">
              {visibleCards.length}/{session.cards.length} {t('panelCards')}
              {interleaved ? ` · ${t('leitnerInterleaveToggle')}` : ''}
              {typeFilter !== 'all' ? ` · ${leitnerCardTypeLabel(typeFilter, lang)}` : ''}
            </span>
          </div>
        </div>

        {artifactStale && onAcknowledgeStale && (
          <div className="px-4 pb-2">
            <LeitnerStaleArtifactBanner
              lang={lang}
              placement="header"
              onDismiss={onAcknowledgeStale}
            />
          </div>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div className="px-4 pb-2">
            <div
              className="rounded-xl border-0 bg-accent-amber/8 px-3 py-2 type-caption leading-snug text-text-secondary"
              data-testid="leitner-weak-extraction"
            >
              <p>
                {session.passageGrounded
                  ? t('panelPassageGroundedLeitner')
                  : t('panelWeakExtractionLeitner')}
              </p>
            </div>
          </div>
        )}

        <CollapsibleChromeSection
          title={t('leitnerFiltersChrome')}
          alwaysCollapse
          data-testid="leitner-filters-chrome"
        >
          <div className="space-y-2 px-4 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[140px] max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden />
                <label className="sr-only" htmlFor="leitner-filter-input">
                  {t('panelSearchCards')}
                </label>
                <input
                  id="leitner-filter-input"
                  type="search"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={t('panelSearchCards')}
                  className="w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 py-1.5 pl-8 pr-2 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                  data-testid="leitner-filter"
                />
              </div>
              {onOpenInReader && (
                <button
                  type="button"
                  onClick={() => onOpenInReader(concept)}
                  className="ws-touch-floor inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-1.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  data-testid="leitner-open-reader"
                >
                  {t('cognitiveReader')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setInterleaved((v) => !v)}
                className={`ws-touch-floor min-h-8 rounded-lg border-0 px-2.5 py-1 type-caption font-medium transition-colors ${
                  interleaved
                    ? 'bg-brand-500/10 text-text-primary'
                    : 'bg-surface-secondary/55 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
                data-testid="leitner-interleave-toggle"
              >
                {t('leitnerInterleaveToggle')}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5" data-testid="leitner-type-filter">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`rounded-lg border-0 px-2.5 py-1 type-caption font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-brand-500/10 text-text-primary'
                    : 'bg-surface-secondary/40 text-text-muted hover:text-text-secondary'
                }`}
              >
                {t('leitnerCardTypeAll')} ({session.cards.length})
              </button>
              {LEITNER_CARD_TYPES.map((type) => {
                const count = typeCounts[type];
                if (count === 0) return null;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`rounded-lg border-0 px-2.5 py-1 type-caption font-medium transition-colors ${
                      typeFilter === type
                        ? 'bg-surface-secondary text-text-primary'
                        : 'bg-surface-secondary/40 text-text-muted hover:text-text-secondary'
                    }`}
                    data-testid={`leitner-type-${type}`}
                  >
                    {leitnerCardTypeLabel(type, lang)} ({count})
                  </button>
                );
              })}
            </div>

            {filterQuery.trim() && filterMatches.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="leitner-filter-matches">
                {filterMatches.slice(0, 6).map((card) => (
                  <button
                    key={card.front}
                    type="button"
                    onClick={() => onOpenInReader?.(card.front)}
                    className="rounded-lg border-0 bg-surface-secondary/70 px-2 py-0.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  >
                    {card.front.slice(0, 48)}{card.front.length > 48 ? '…' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleChromeSection>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleCards.length === 0 ? (
          <div className="p-4 text-center type-caption text-text-muted" data-testid="leitner-type-empty">
            {t('leitnerFilterNoMatch')}
          </div>
        ) : (
          <LeitnerBox
            concept={concept}
            cards={visibleCards}
            scopeKey={scopeKey}
            spacingIntervals={spacingIntervals}
            onSessionDirty={onSessionDirty}
            onRate={onRate}
            onOpenQuiz={onOpenQuiz}
            onQuizCard={onQuizCard}
            onOpenInReader={onOpenInReader}
            hasSource={session.hasSource}
            artifactStale={artifactStale}
            onAcknowledgeStale={onAcknowledgeStale}
            lang={lang}
            interleaved={interleaved}
            showDeckTopic={false}
          />
        )}
      </div>
    </div>
  );
}
