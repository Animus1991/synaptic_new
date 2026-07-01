import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from '@/lib/lucide-shim';
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
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { LeitnerBox } from './LeitnerBox';
import { LeitnerStaleArtifactBanner } from './LeitnerStaleArtifactBanner';
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
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
};

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
  artifactStale = false,
  onAcknowledgeStale,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LeitnerCardType | 'all'>('all');
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
      <WorkspaceEmptyState
        tool="leitner"
        message={emptyMessage ?? (t('panelEmptyLeitner'))}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.cards.length === 0) {
    return (
      <div className="p-4" data-testid="leitner-panel-empty">
        <WorkspaceEmptyState
        tool="leitner"
          message={emptyMessage ?? t('panelEmptyLeitnerNoCards')}
          hasSource
          onUpload={onUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="leitner-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="leitner-section-label">
            {t('wsSectionColon')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {artifactStale && onAcknowledgeStale && (
          <LeitnerStaleArtifactBanner
            lang={lang}
            placement="header"
            onDismiss={onAcknowledgeStale}
          />
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="leitner-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              {session.passageGrounded
                ? t('panelPassageGroundedLeitner')
                : t('panelWeakExtractionLeitner')}
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
              placeholder={t('panelSearchCards')}
              className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
              data-testid="leitner-filter"
            />
          </div>
          <span className="text-[10px] text-text-muted">
            {visibleCards.length}/{session.cards.length} {t('panelCards')}
          </span>
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
              data-testid="leitner-open-reader"
            >
              <BookOpen className="w-3 h-3" />
              Reader
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="leitner-type-filter">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors ${
              typeFilter === 'all'
                ? 'border-accent-cyan/40 bg-accent-cyan/15 text-brand-800'
                : 'border-border-subtle text-text-muted hover:text-text-secondary'
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
                className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors ${
                  typeFilter === type
                    ? 'border-brand-500/40 bg-brand-600/12 text-brand-800'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
                data-testid={`leitner-type-${type}`}
              >
                {leitnerCardTypeLabel(type, lang)} ({count})
              </button>
            );
          })}
        </div>

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="leitner-filter-matches">
            {filterMatches.slice(0, 6).map((card) => (
              <button
                key={card.front}
                type="button"
                onClick={() => onOpenInReader?.(card.front)}
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-brand-800 hover:opacity-90"
              >
                {card.front.slice(0, 48)}{card.front.length > 48 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleCards.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-text-muted" data-testid="leitner-type-empty">
            {t('panelEmptyLeitnerNoCards')}
          </div>
        ) : (
        <LeitnerBox
          concept={concept}
          cards={visibleCards}
          scopeKey={scopeKey}
          spacingIntervals={spacingIntervals}
          onRate={onRate}
          onOpenQuiz={onOpenQuiz}
          onQuizCard={onQuizCard}
          onOpenInReader={onOpenInReader}
          hasSource={session.hasSource}
          artifactStale={artifactStale}
          onAcknowledgeStale={onAcknowledgeStale}
          lang={lang}
        />
        )}
      </div>
    </div>
  );
}
