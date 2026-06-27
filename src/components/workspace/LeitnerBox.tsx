import { useState, useEffect, useCallback, useMemo } from 'react';

import { Layers, RotateCcw, Download } from '@/lib/lucide-shim';

import { cn } from '../../utils/cn';

import type { FsrsRating } from '../../lib/pedagogy';

import type { SpacingData } from '../../types';

import { useI18n } from '../../lib/i18n';

import { downloadAnkiDeck } from '../../lib/ankiExport';

import { buildDueHeatmap } from '../../lib/leitnerDueHeatmap';
import { leitnerCardSourceLabel } from '../../lib/leitnerCardSources';
import type { LeitnerCard } from '../../lib/leitnerSessionModel';

import { saveDeckState, syncDeckState } from '../../lib/leitnerDeckSync';

import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { LeitnerStaleArtifactBanner } from './LeitnerStaleArtifactBanner';



const BOX_KEYS = ['leitnerAgain', 'leitnerHard', 'leitnerGood', 'leitnerEasy'] as const;



interface LeitnerBoxProps {

  cards?: LeitnerCard[];

  concept?: string;

  scopeKey?: string;

  spacingIntervals?: SpacingData[];

  onRate?: (rating: FsrsRating) => void;

  completeOnRate?: boolean;

  emptyMessage?: string;

  hasSource?: boolean;

  onUpload?: () => void;
  onOpenQuiz?: () => void;
  onQuizCard?: (front: string) => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
  lang?: 'en' | 'el';
}



export function LeitnerBox({

  cards = [],

  concept,

  scopeKey = '__global',

  spacingIntervals = [],

  onRate,

  completeOnRate = false,

  emptyMessage,

  hasSource = false,

  onUpload,

  onOpenQuiz,
  onQuizCard,
  artifactStale = false,
  onAcknowledgeStale,
  lang: langProp,
}: LeitnerBoxProps) {

  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;

  const [deck, setDeck] = useState(cards);

  const [index, setIndex] = useState(0);

  const [flipped, setFlipped] = useState(false);

  const [boxCounts, setBoxCounts] = useState([0, 0, 0, 0]);

  const [dueCount, setDueCount] = useState(0);

  const [finished, setFinished] = useState(false);



  useEffect(() => {

    if (cards.length === 0) return;

    const synced = syncDeckState(scopeKey, cards, spacingIntervals, concept ?? '');

    setDeck(synced.ordered);

    setIndex(synced.resumedIndex);

    setDueCount(synced.dueCount);

    setBoxCounts(synced.boxCounts ?? [0, 0, 0, 0]);

  }, [cards, spacingIntervals, concept, scopeKey]);



  const heatmap = useMemo(

    () => buildDueHeatmap(spacingIntervals, concept ?? '', 7, new Date(), lang),

    [spacingIntervals, concept, lang],

  );



  const card = deck.length > 0 ? deck[index % deck.length] : null;



  const persistProgress = useCallback((nextIndex: number, counts: number[]) => {

    saveDeckState(scopeKey, {

      index: nextIndex,

      boxCounts: counts,

      lastSyncedAt: new Date().toISOString(),

      cardOrder: deck.map((c) => c.front),

    });

  }, [scopeKey, deck]);



  const rate = useCallback((rating: FsrsRating) => {

    if (finished || !card) return;

    const boxIdx = { again: 0, hard: 1, good: 2, easy: 3 }[rating];

    const nextCounts = boxCounts.map((c, i) => (i === boxIdx ? c + 1 : c));

    setBoxCounts(nextCounts);

    onRate?.(rating);

    if (completeOnRate) {

      persistProgress(index, nextCounts);

      setFinished(true);

      return;

    }

    setFlipped(false);

    const nextIndex = index + 1;

    setIndex(nextIndex);

    persistProgress(nextIndex, nextCounts);

  }, [finished, card, onRate, completeOnRate, boxCounts, index, persistProgress]);



  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (finished || deck.length === 0) return;

      if (e.code === 'Space') {

        e.preventDefault();

        setFlipped((f) => !f);

        return;

      }

      if (!flipped) return;

      const map: Record<string, FsrsRating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };

      const rating = map[e.key];

      if (rating) {

        e.preventDefault();

        rate(rating);

      }

    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);

  }, [finished, deck.length, flipped, rate]);



  if (deck.length === 0) {

    return (

      <WorkspaceEmptyState

        message={emptyMessage ?? 'Upload notes to generate flashcards from your glossary and definitions.'}

        hasSource={hasSource}

        onUpload={onUpload}

      />

    );

  }



  return (

    <div className="flex flex-col h-full p-4">

      {artifactStale && onAcknowledgeStale && (
        <LeitnerStaleArtifactBanner
          lang={lang}
          placement="deck-sticky"
          onDismiss={onAcknowledgeStale}
        />
      )}

      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">

        <Layers className="w-4 h-4 text-accent-amber" />

        {t('leitnerBox')}{concept ? `: ${concept}` : ''}

        {dueCount > 0 && (

          <span

            data-testid="leitner-due-badge"

            className="rounded-full bg-accent-rose/20 px-2 py-0.5 text-[9px] font-semibold text-accent-rose"

          >

            {dueCount} {lang === 'el' ? 'λόγω ουράς' : 'due'}

          </span>

        )}

        {onOpenQuiz && (
          <button
            type="button"
            data-testid="leitner-open-quiz"
            onClick={onOpenQuiz}
            className="ml-auto flex items-center gap-1 text-[10px] font-medium text-accent-cyan hover:text-accent-cyan/80 border border-accent-cyan/30 rounded-lg px-2 py-0.5 mr-1"
          >
            {lang === 'el' ? 'Κουίζ' : 'Quiz'}
          </button>
        )}

        {deck.length > 0 && (

          <button

            type="button"

            data-testid="leitner-export-anki"

            onClick={() => downloadAnkiDeck(deck, `Synapse — ${concept || 'deck'}`, `synapse-${concept || 'deck'}`, concept ? [concept] : [])}

            className="ml-auto flex items-center gap-1 text-[10px] font-medium text-brand-400 hover:text-brand-300 border border-brand-500/30 rounded-lg px-2 py-0.5"

            title={lang === 'el' ? 'Εξαγωγή Anki' : 'Export Anki'}

          >

            <Download className="w-3 h-3" />

            Anki

          </button>

        )}

      </h3>



      <div className="mb-3" data-testid="leitner-due-heatmap">

        <p className="text-[9px] font-semibold text-text-muted mb-1">

          {lang === 'el' ? 'Ουρά επανάληψης (7ημ)' : 'Due queue (7d)'}

        </p>

        <div className="flex gap-1">

          {heatmap.map((day) => (

            <div

              key={day.dayOffset}

              title={`${day.label}: ${day.dueCount}`}

              className="flex-1 rounded-md border border-border-subtle/60 p-1 text-center"

              style={{ backgroundColor: `rgba(251, 191, 36, ${0.08 + day.intensity * 0.45})` }}

            >

              <p className="text-[8px] text-text-muted truncate">{day.label}</p>

              <p className="text-[10px] font-bold text-accent-amber">{day.dueCount}</p>

            </div>

          ))}

        </div>

      </div>



      <div className="grid grid-cols-4 gap-2 mb-4">

        {BOX_KEYS.map((key, i) => (

          <div key={key} className="p-2 rounded-lg bg-surface-primary/50 border border-border-subtle text-center">

            <p className="text-lg font-bold">{boxCounts[i]}</p>

            <p className="text-[9px] text-text-muted">{t(key)}</p>

          </div>

        ))}

      </div>



      <button

        onClick={() => setFlipped(!flipped)}

        className="flex-1 min-h-[140px] rounded-xl border border-brand-500/30 bg-brand-500/5 p-5 text-left hover:border-brand-500/50 transition-all"

      >

        <p className="text-[10px] text-text-muted mb-2">{flipped ? t('answer') : t('question')}</p>
        {card?.source && (
          <span
            className="mb-2 inline-block rounded-full border border-brand-500/25 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-300"
            data-testid="leitner-card-source"
          >
            {leitnerCardSourceLabel(card.source, lang)}
          </span>
        )}
        <p className="text-sm font-medium leading-relaxed">{flipped ? card!.back : card!.front}</p>

      </button>



      {finished && (

        <p className="mt-4 text-center text-sm text-accent-emerald font-medium">

          {t('reviewLogged')}

        </p>

      )}



      {flipped && !finished && onQuizCard && card && (
        <button
          type="button"
          data-testid="leitner-quiz-this-card"
          onClick={() => onQuizCard(card.front)}
          className="mt-2 w-full rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 py-1.5 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
        >
          {lang === 'el' ? 'Κουίζ αυτής της κάρτας →' : 'Quiz this card →'}
        </button>
      )}

      {flipped && !finished && (

        <p className="mt-2 text-center text-[10px] text-text-muted">Space · 1–4 {lang === 'el' ? 'αξιολόγηση' : 'rate'}</p>

      )}



      {flipped && !finished && (

        <div className="grid grid-cols-4 gap-2 mt-2">

          {([

            { rating: 'again' as FsrsRating, key: 'leitnerAgain' as const, color: 'border-accent-rose/40 text-accent-rose' },

            { rating: 'hard' as FsrsRating, key: 'leitnerHard' as const, color: 'border-accent-orange/40 text-accent-orange' },

            { rating: 'good' as FsrsRating, key: 'leitnerGood' as const, color: 'border-accent-amber/40 text-accent-amber' },

            { rating: 'easy' as FsrsRating, key: 'leitnerEasy' as const, color: 'border-accent-emerald/40 text-accent-emerald' },

          ]).map(({ rating, key, color }) => (

            <button

              key={rating}

              onClick={() => rate(rating)}

              className={cn('min-h-11 py-2 rounded-lg text-xs font-medium border transition-all hover:opacity-90 touch-manipulation', color)}

            >

              {t(key)}

            </button>

          ))}

        </div>

      )}



      <button

        onClick={() => {

          setFlipped(false);

          setIndex(0);

          setBoxCounts([0, 0, 0, 0]);

          setFinished(false);

          saveDeckState(scopeKey, {

            index: 0,

            boxCounts: [0, 0, 0, 0],

            lastSyncedAt: new Date().toISOString(),

            cardOrder: deck.map((c) => c.front),

          });

        }}

        className="mt-3 flex items-center justify-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"

      >

        <RotateCcw className="w-3 h-3" /> {t('resetDeck')}

      </button>

    </div>

  );

}


