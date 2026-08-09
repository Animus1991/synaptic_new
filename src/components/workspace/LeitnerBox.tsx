import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RotateCcw, Download, Upload } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { PanelOverflowMenu } from './PanelOverflowMenu';
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
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
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
  /** When false, skip deck topic line (parent already shows section meta). OPT-K160 */
  showDeckTopic?: boolean;
}
/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
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
  showDeckTopic = true,
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
  const resetDeck = () => {
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
  };

  return (
    <div className="leitner-box-shell flex h-full flex-col px-4 pb-4 pt-2" data-clarity-pass="k162">
      {artifactStale && onAcknowledgeStale && (
        <LeitnerStaleArtifactBanner
          lang={lang}
          placement="deck-sticky"
          onDismiss={onAcknowledgeStale}
        />
      )}
      {/* OPT-K160 — due badge + deck ⋯; topic optional to avoid section echo */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showDeckTopic && concept ? (
            <p className="truncate type-caption font-medium text-text-secondary" data-testid="leitner-deck-topic">
              {concept}
            </p>
          ) : null}
          {dueCount > 0 && (
            <span
              data-testid="leitner-due-badge"
              className="shrink-0 rounded-lg border-0 bg-accent-rose/10 px-2 py-0.5 type-caption font-medium text-text-secondary"
            >
              {dueCount} {t('leitnerDueBadge')}
            </span>
          )}
        </div>
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
        <PanelOverflowMenu
          className="shrink-0"
          ariaLabel={t('leitnerDeckMenuAria')}
          triggerTestId="leitner-deck-menu"
          menuClassName="min-w-[11rem]"
        >
          {onOpenQuiz && (
            <button
              type="button"
              data-testid="leitner-open-quiz"
              onClick={onOpenQuiz}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('quiz')}
            </button>
          )}
          <button
            type="button"
            data-testid="leitner-reset-deck"
            onClick={resetDeck}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t('resetDeck')}
          </button>
          <button
            type="button"
            data-testid="leitner-import-anki"
            onClick={() => importRef.current?.click()}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {t('leitnerImportAnki')}
          </button>
          <button
            type="button"
            data-testid="leitner-export-anki"
            onClick={() => void handleAnkiExportApkg()}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {t('leitnerExportAnkiApkg')}
          </button>
          <button
            type="button"
            data-testid="leitner-export-anki-tsv"
            onClick={() => void handleAnkiExportTsv()}
            className="block w-full px-3 py-1.5 text-left type-caption text-text-muted hover:bg-surface-hover hover:text-text-primary"
          >
            {t('leitnerExportAnkiTsv')}
          </button>
        </PanelOverflowMenu>
      </div>
      {importError && (
        <p className="mb-2 type-caption text-accent-rose" title={importError} data-testid="leitner-import-error">
          {importError}
        </p>
      )}

      {/* Wave FC — card stage hero; schedule chrome nested closed */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="leitner-box-main flex min-h-0 flex-col">
          <div className="leitner-flip-stage flex min-h-0 flex-col">
            <button
              type="button"
              onClick={() => setFlipped(!flipped)}
              aria-label={flipped ? t('answer') : t('leitnerTapToFlip')}
              className={cn(
                'leitner-flip-card w-full min-h-[8rem] max-h-[min(40vh,20rem)] overflow-y-auto p-4 text-left transition-all sm:min-h-[9rem]',
                flipped && 'leitner-flip-card--flipped',
              )}
              data-testid="leitner-flip-card"
            >
              <p className="mb-2 type-caption text-text-muted">
                {flipped ? t('answer') : t('leitnerTapToFlip')}
              </p>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {card && (
                  <span
                    className="inline-block rounded-lg border-0 bg-surface-secondary/70 px-2 py-0.5 type-caption font-medium text-text-secondary"
                    data-testid="leitner-card-type"
                  >
                    {leitnerCardTypeLabel(inferLeitnerCardType(card), lang)}
                  </span>
                )}
                {card?.source && (
                  <span
                    className="inline-block rounded-lg border-0 bg-surface-secondary/55 px-2 py-0.5 type-caption font-medium text-text-secondary"
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
                <p className="type-body font-medium leading-relaxed text-text-primary">
                  {flipped ? card!.back : card!.front}
                </p>
              )}
            </button>
          </div>
          {finished && (
            <p className="mt-4 text-center type-meta font-medium text-accent-emerald">
              {t('reviewLogged')}
            </p>
          )}
          {flipped && !finished && onQuizCard && card && (
            <button
              type="button"
              data-testid="leitner-quiz-this-card"
              onClick={() => onQuizCard(card.front)}
              className="ws-touch-floor mt-2 w-full min-h-8 rounded-lg border-0 bg-surface-secondary/70 py-2 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {t('leitnerQuizThisCard')}
            </button>
          )}
          {flipped && !finished && (
            <p className="mt-2 text-center type-caption text-text-muted">
              Space · 1–4 {t('leitnerRateKeyboard')}
            </p>
          )}
          {flipped && !finished && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                { rating: 'again' as FsrsRating, key: 'leitnerAgain' as const, color: 'bg-accent-rose/8 text-text-secondary hover:text-accent-rose' },
                { rating: 'hard' as FsrsRating, key: 'leitnerHard' as const, color: 'bg-accent-orange/8 text-text-secondary hover:text-accent-orange' },
                { rating: 'good' as FsrsRating, key: 'leitnerGood' as const, color: 'bg-accent-amber/8 text-text-secondary hover:text-accent-amber' },
                { rating: 'easy' as FsrsRating, key: 'leitnerEasy' as const, color: 'bg-accent-emerald/8 text-text-secondary hover:text-accent-emerald' },
              ]).map(({ rating, key, color }) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => rate(rating)}
                  className={cn(
                    'ws-touch-floor min-h-8 rounded-lg border-0 py-2 type-caption font-medium transition-colors touch-manipulation',
                    color,
                  )}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          )}
        </div>

        <CollapsibleChromeSection
          title={t('leitnerQueuesChrome')}
          alwaysCollapse
          data-testid="leitner-queues-chrome"
        >
          <aside className="leitner-box-sidebar min-h-0 space-y-3 overflow-y-auto p-3">
            <p className="type-caption leading-relaxed text-text-secondary">{t('leitnerBoxSidebarHint')}</p>
            <div data-testid="leitner-due-heatmap">
              <p className="mb-1 type-caption font-medium text-text-muted">
                {t('leitnerDueQueue7d')}
              </p>
              <div className="flex gap-1">
                {heatmap.map((day) => (
                  <div
                    key={day.dayOffset}
                    title={`${day.label}: ${day.dueCount}`}
                    className="flex-1 rounded-lg border-0 p-1 text-center"
                    style={{ backgroundColor: `rgba(251, 191, 36, ${0.08 + day.intensity * 0.45})` }}
                  >
                    <p className="truncate type-caption text-text-muted">{day.label}</p>
                    <p className="type-caption font-semibold tabular-nums text-text-secondary">{day.dueCount}</p>
                  </div>
                ))}
              </div>
            </div>
            <LeitnerDueQueuePanel items={dueQueue} onSelect={handleDueQueueSelect} lang={lang} />
            {boxCounts.every((n) => n === 0) ? (
              <p className="type-caption text-text-muted" data-testid="leitner-fsrs-empty">
                {t('leitnerFsrsEmptyHint')}
              </p>
            ) : (
              <LeitnerFsrsBoxRail
                counts={boxCounts}
                total={deck.length}
                activeIndex={activeBoxIndex}
                onSelect={setActiveBoxIndex}
              />
            )}
          </aside>
        </CollapsibleChromeSection>
      </div>
    </div>
  );
}
