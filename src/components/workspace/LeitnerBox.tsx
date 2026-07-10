import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { Layers, RotateCcw, Download, Upload } from '@/lib/lucide-shim';

import { cn } from '../../utils/cn';

import type { FsrsRating } from '../../lib/pedagogy';

import type { SpacingData } from '../../types';

import { useI18n } from '../../lib/i18n';

import { downloadAnkiDeck, downloadAnkiDeckApkg } from '../../lib/ankiExport';
import { buildAnkiSchedulingTags, matchSpacingForCard, mergeCardTags } from '../../lib/ankiScheduling';
import { runPluginHook } from '../../lib/pluginApi';

import { buildDueHeatmap } from '../../lib/leitnerDueHeatmap';
import { buildFsrsDueQueue, findDeckIndexForConcept } from '../../lib/leitnerDueQueue';
import { leitnerCardSourceLabel } from '../../lib/leitnerCardSources';
import { inferLeitnerCardType, leitnerCardTypeLabel } from '../../lib/leitnerCardTypes';
import { readAnkiFile } from '../../lib/ankiImport';
import { notifyError, notifySuccess, notifyWarning } from '../../lib/notificationBus';
import { mergeLeitnerCards, type LeitnerCard } from '../../lib/leitnerSessionModel';

import { saveDeckState, syncDeckState } from '../../lib/leitnerDeckSync';

import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { LeitnerStaleArtifactBanner } from './LeitnerStaleArtifactBanner';
import { LeitnerDueQueuePanel } from './LeitnerDueQueuePanel';
import { LeitnerFsrsBoxRail } from './LeitnerFsrsBoxRail';
import { SourceCitationChip } from './SourceCitationChip';
import { LeitnerOcclusionFace } from './LeitnerOcclusionFace';




interface LeitnerBoxProps {

  cards?: LeitnerCard[];

  concept?: string;

  scopeKey?: string;

  spacingIntervals?: SpacingData[];

  onRate?: (rating: FsrsRating) => void;

  completeOnRate?: boolean;

  emptyMessage?: string;

  hasSource?: boolean;
  onSessionDirty?: () => void;

  onUpload?: () => void;
  onOpenQuiz?: () => void;
  onQuizCard?: (front: string) => void;
  onOpenInReader?: (query: string) => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
  lang?: 'en' | 'el';
  interleaved?: boolean;
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
  onSessionDirty,

  onUpload,

  onOpenQuiz,
  onQuizCard,
  onOpenInReader,
  artifactStale = false,
  onAcknowledgeStale,
  lang: langProp,
  interleaved = false,
}: LeitnerBoxProps) {

  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;

  const [deck, setDeck] = useState(cards);

  const [index, setIndex] = useState(0);

  const [flipped, setFlipped] = useState(false);

  const [boxCounts, setBoxCounts] = useState([0, 0, 0, 0]);

  const [dueCount, setDueCount] = useState(0);

  const [finished, setFinished] = useState(false);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleAnkiImport = useCallback(async (file: File) => {
    setImportError(null);
    try {
      const parsed = await readAnkiFile(file);
      if (parsed.length === 0) {
        const msg = lang === 'el' ? 'Δεν βρέθηκαν κάρτες στο αρχείο.' : 'No cards found in file.';
        setImportError(msg);
        notifyWarning(lang === 'el' ? 'Κενό αρχείο Anki' : 'Empty Anki file', msg);
        return;
      }
      const imported: LeitnerCard[] = parsed.map((c) => ({ front: c.front, back: c.back }));
      setDeck((prev) => mergeLeitnerCards(prev, imported));
      setIndex(0);
      setFinished(false);
      onSessionDirty?.();
      notifySuccess(
        lang === 'el' ? 'Εισαγωγή Anki' : 'Anki import complete',
        lang === 'el'
          ? `${parsed.length} κάρτε${parsed.length === 1 ? 'α' : 'ες'} προστέθηκαν`
          : `${parsed.length} card${parsed.length === 1 ? '' : 's'} added`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(msg);
      notifyError(lang === 'el' ? 'Αποτυχία εισαγωγής Anki' : 'Anki import failed', msg);
    }
  }, [onSessionDirty, lang]);

  const buildAnkiExportCards = useCallback(async () => {
    let exportCards = deck.map((card) => {
      const spacing = matchSpacingForCard(card.front, spacingIntervals ?? []);
      const tags = spacing
        ? mergeCardTags(concept ? [concept] : [], buildAnkiSchedulingTags(spacing))
        : (concept ? [concept] : []);
      return { front: card.front, back: card.back, tags };
    });
    exportCards = (await runPluginHook('leitner:beforeExport', exportCards)) as typeof exportCards;
    return exportCards;
  }, [deck, spacingIntervals, concept]);

  const handleAnkiExportTsv = useCallback(async () => {
    const exportCards = await buildAnkiExportCards();
    downloadAnkiDeck(
      exportCards,
      `Synapse — ${concept || 'deck'}`,
      `synapse-${concept || 'deck'}`,
      concept ? [concept, 'synapse:fsrs'] : ['synapse:fsrs'],
    );
  }, [buildAnkiExportCards, concept]);

  const handleAnkiExportApkg = useCallback(async () => {
    const exportCards = await buildAnkiExportCards();
    await downloadAnkiDeckApkg(
      exportCards,
      `Synapse — ${concept || 'deck'}`,
      `synapse-${concept || 'deck'}`,
    );
  }, [buildAnkiExportCards, concept]);



  useEffect(() => {

    if (cards.length === 0) return;

    const synced = syncDeckState(scopeKey, cards, spacingIntervals, concept ?? '', { interleaved });

    setDeck(synced.ordered);

    setIndex(synced.resumedIndex);

    setDueCount(synced.dueCount);

    setBoxCounts(synced.boxCounts ?? [0, 0, 0, 0]);
    onSessionDirty?.();

  }, [cards, spacingIntervals, concept, scopeKey, onSessionDirty, interleaved]);



  const heatmap = useMemo(
    () => buildDueHeatmap(spacingIntervals, concept ?? '', 7, new Date(), lang),
    [spacingIntervals, concept, lang],
  );

  const dueQueue = useMemo(
    () => buildFsrsDueQueue(spacingIntervals, deck, concept ?? '', new Date()),
    [spacingIntervals, deck, concept],
  );

  const handleDueQueueSelect = useCallback((itemConcept: string) => {
    const idx = findDeckIndexForConcept(deck, itemConcept);
    if (idx >= 0) {
      setIndex(idx);
      setFlipped(false);
      setFinished(false);
    }
  }, [deck]);



  const card = deck.length > 0 ? deck[index % deck.length] : null;



  const persistProgress = useCallback((nextIndex: number, counts: number[]) => {

    saveDeckState(scopeKey, {

      index: nextIndex,

      boxCounts: counts,

      lastSyncedAt: new Date().toISOString(),

      cardOrder: deck.map((c) => c.front),

    });
    onSessionDirty?.();

  }, [scopeKey, deck, onSessionDirty]);



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

      <WorkspaceToolEmptyState
        tool="leitner"
        concept={concept}
        message={emptyMessage}
        hasSource={hasSource ?? false}
        onUpload={onUpload}
      />

    );

  }



  return (

    <div className="flex flex-col h-full p-4 leitner-box-shell">

      {artifactStale && onAcknowledgeStale && (
        <LeitnerStaleArtifactBanner
          lang={lang}
          placement="deck-sticky"
          onDismiss={onAcknowledgeStale}
        />
      )}

      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 xl:col-span-2">

        <Layers className="w-4 h-4 text-accent-amber" />

        {t('leitnerBox')}{concept ? `: ${concept}` : ''}

        {dueCount > 0 && (

          <span

            data-testid="leitner-due-badge"

            className="rounded-full bg-accent-rose/20 px-2 py-0.5 text-[9px] font-semibold text-accent-rose"

          >

            {dueCount} {t('leitnerDueBadge')}

          </span>

        )}

        {onOpenQuiz && (
          <button
            type="button"
            data-testid="leitner-open-quiz"
            onClick={onOpenQuiz}
            className="ml-auto flex items-center gap-1 text-[10px] font-medium text-brand-800 hover:opacity-80 border border-accent-cyan/30 rounded-lg px-2 py-0.5 mr-1"
          >
            {t('quiz')}
          </button>
        )}

        {deck.length > 0 && (
          <details className="relative group">
            <summary
              className="flex items-center gap-1 text-[10px] font-medium text-brand-700 hover:text-brand-800 border border-brand-500/30 rounded-lg px-2 py-0.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              title={t('leitnerExportAnki')}
              data-testid="leitner-export-anki"
            >
              <Download className="w-3 h-3" />
              Anki
            </summary>
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[7rem] rounded-lg border border-border-subtle bg-surface-elevated shadow-lg py-1">
              <button
                type="button"
                data-testid="leitner-export-anki-apkg"
                onClick={() => void handleAnkiExportApkg()}
                className="block w-full text-left px-2 py-1 text-[10px] font-medium text-text-primary hover:bg-surface-muted"
              >
                {t('leitnerExportAnkiApkg')}
              </button>
              <button
                type="button"
                data-testid="leitner-export-anki-tsv"
                onClick={() => void handleAnkiExportTsv()}
                className="block w-full text-left px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-muted"
              >
                {t('leitnerExportAnkiTsv')}
              </button>
            </div>
          </details>
        )}

        <input
          ref={importRef}
          type="file"
          accept=".txt,.tsv,.apkg,text/plain,application/octet-stream"
          className="hidden"
          data-testid="leitner-import-anki-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleAnkiImport(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          data-testid="leitner-import-anki"
          onClick={() => importRef.current?.click()}
          className="flex items-center gap-1 text-[10px] font-medium text-text-secondary hover:text-text-primary border border-border-subtle rounded-lg px-2 py-0.5"
          title={t('leitnerImportAnki')}
        >
          <Upload className="w-3 h-3" />
          {lang === 'el' ? 'Εισαγωγή' : 'Import'}
        </button>

        {importError && (
          <span className="text-[9px] text-red-500 max-w-[12rem] truncate" title={importError}>
            {importError}
          </span>
        )}

      </h3>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr] flex-1 min-h-0">
        <aside className="leitner-box-sidebar space-y-3 min-h-0 overflow-y-auto">
          <p className="text-sm leading-6 text-text-secondary">{t('leitnerBoxSidebarHint')}</p>

      <div className="mb-1" data-testid="leitner-due-heatmap">

        <p className="text-[9px] font-semibold text-text-muted mb-1">

          {t('leitnerDueQueue7d')}

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

      <LeitnerDueQueuePanel items={dueQueue} onSelect={handleDueQueueSelect} lang={lang} />

      <LeitnerFsrsBoxRail
        counts={boxCounts}
        total={deck.length}
        activeIndex={activeBoxIndex}
        onSelect={setActiveBoxIndex}
      />
        </aside>

        <div className="leitner-box-main flex flex-col min-h-0">

      <div className="leitner-flip-stage flex-1 flex flex-col min-h-0">
      <button

        onClick={() => setFlipped(!flipped)}

        className={cn(
          'leitner-flip-card flex-1 min-h-[140px] p-5 text-left transition-all',
          flipped && 'leitner-flip-card--flipped',
        )}

      >

        <p className="text-[10px] text-text-muted mb-2">{flipped ? t('answer') : t('question')}</p>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {card && (
            <span
              className="inline-block rounded-full border border-accent-cyan/25 bg-accent-cyan/10 px-2 py-0.5 text-[9px] font-medium text-brand-800"
              data-testid="leitner-card-type"
            >
              {leitnerCardTypeLabel(inferLeitnerCardType(card), lang)}
            </span>
          )}
          {card?.source && (
            <span
              className="inline-block rounded-full border border-brand-500/25 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-800"
              data-testid="leitner-card-source"
            >
              {leitnerCardSourceLabel(card.source, lang)}
            </span>
          )}
        </div>
        {card?.citation && (
          <SourceCitationChip
            citation={card.citation}
            onOpenInReader={onOpenInReader}
            className="mb-2"
          />
        )}
        {card?.occlusion ? (
          <LeitnerOcclusionFace occlusion={card.occlusion} flipped={flipped} />
        ) : (
          <p className="text-sm font-medium leading-relaxed">{flipped ? card!.back : card!.front}</p>
        )}

      </button>
      </div>



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
          className="mt-2 w-full rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 py-1.5 text-[10px] font-medium text-brand-800 hover:opacity-90"
        >
          {t('leitnerQuizThisCard')}
        </button>
      )}

      {flipped && !finished && (

        <p className="mt-2 text-center text-[10px] text-text-muted">Space · 1–4 {t('leitnerRateKeyboard')}</p>

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
      </div>

    </div>

  );

}


