import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Sparkles, Type, Volume2, Highlighter, Download, StickyNote, X, Languages } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import type { SourceHighlight } from '../../lib/conceptProvenance';
import { normalizeFocusTerm } from '../../lib/workspaceFocus';
import {
  exportReaderAnnotationsJson,
  exportReaderAnnotationsMarkdown,
  loadReaderAnnotations,
  saveReaderAnnotations,
  segmentAnnotatedRange,
  type ReaderAnnotation,
} from '../../lib/readerAnnotationStore';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import type { GlossaryEntry, UserSettings } from '../../types';
import {
  buildGlossaryCompanionColumns,
  loadCachedTranslations,
  mergeFullTranslation,
  saveCachedTranslations,
  splitReaderParagraphs,
  translateParagraphsLlm,
  type BilingualParagraph,
  type TranslationMode,
} from '../../lib/readerTranslation';
import {
  paragraphIndexForTerm,
  scrollBothToParagraph,
  syncBilingualByParagraph,
} from '../../lib/readerBilingualSync';
import { speakParagraphs } from '../../lib/readerTts';
import { buildOcrOverlayRegions, needsOcrOverlay } from '../../lib/readerOcrOverlay';
import { isLlmAvailable } from '../../lib/llmClient';

const ANN_COLORS = ['#818cf8', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];

interface Props {
  text?: string;
  complexityThreshold?: number;
  emptyMessage?: string;
  onUpload?: () => void;
  highlight?: SourceHighlight | null;
  focusTerm?: string;
  onTermFocus?: (term: string) => void;
  lang?: 'en' | 'el';
  annotationScopeKey?: string;
  sourceName?: string;
  glossary?: GlossaryEntry[];
  concept?: string;
  userSettings?: UserSettings;
}

function getTextOffset(root: HTMLElement, targetNode: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === targetNode) return charCount + offset;
    charCount += current.textContent?.length ?? 0;
  }
  return charCount;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CognitiveReader({
  text = '',
  complexityThreshold = 25,
  emptyMessage,
  onUpload,
  highlight,
  focusTerm,
  onTermFocus,
  lang = 'en',
  annotationScopeKey = '__global',
  sourceName,
  glossary = [],
  concept,
  userSettings,
}: Props) {
  const { t } = useI18n();
  const [bionic, setBionic] = useState(false);
  const [highlightComplexity, setHighlightComplexity] = useState(false);
  const [dyslexia, setDyslexia] = useState(false);
  const [fullSource, setFullSource] = useState(false);
  const [translationMode, setTranslationMode] = useState<TranslationMode>('off');
  const [bilingual, setBilingual] = useState<BilingualParagraph[]>([]);
  const [translating, setTranslating] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>(() =>
    loadReaderAnnotations(annotationScopeKey),
  );
  const [pendingNote, setPendingNote] = useState<{ start: number; end: number; excerpt: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [activeColor, setActiveColor] = useState(ANN_COLORS[0]!);
  const [showMargin, setShowMargin] = useState(true);
  const markRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const companionScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);
  const ttsRef = useRef<ReturnType<typeof speakParagraphs> | null>(null);
  const [ttsActiveIndex, setTtsActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setAnnotations(loadReaderAnnotations(annotationScopeKey));
  }, [annotationScopeKey]);

  useEffect(() => {
    saveReaderAnnotations(annotationScopeKey, annotations);
  }, [annotations, annotationScopeKey]);

  useEffect(() => {
    if (highlight) markRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, text]);

  const speakSelection = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const sel = window.getSelection()?.toString().trim();
    const toRead = sel || (focusTerm ?? text.slice(0, 400));
    if (!toRead) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(toRead);
    u.lang = lang === 'el' ? 'el-GR' : 'en-US';
    u.rate = dyslexia ? 0.88 : 1;
    window.speechSynthesis.speak(u);
  }, [focusTerm, text, lang, dyslexia]);

  const handleTextMouseUp = useCallback(() => {
    if (!annotateMode || !bodyRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return;
    const range = sel.getRangeAt(0);
    if (!bodyRef.current.contains(range.commonAncestorContainer)) return;
    const start = getTextOffset(bodyRef.current, range.startContainer, range.startOffset);
    const end = getTextOffset(bodyRef.current, range.endContainer, range.endOffset);
    if (end <= start) return;
    setPendingNote({ start, end, excerpt: text.slice(start, end) });
    setNoteDraft('');
  }, [annotateMode, text]);

  const confirmAnnotation = useCallback(() => {
    if (!pendingNote) return;
    const ann: ReaderAnnotation = {
      id: `ra-${Date.now()}`,
      charStart: pendingNote.start,
      charEnd: pendingNote.end,
      color: activeColor,
      note: noteDraft.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, ann]);
    setPendingNote(null);
    setNoteDraft('');
    window.getSelection()?.removeAllRanges();
  }, [pendingNote, activeColor, noteDraft]);

  const removeAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const exportMarkdown = () => {
    downloadBlob(
      `reader-annotations-${annotationScopeKey}.md`,
      exportReaderAnnotationsMarkdown(text, annotations, sourceName),
      'text/markdown',
    );
  };

  const exportJson = () => {
    downloadBlob(
      `reader-annotations-${annotationScopeKey}.json`,
      exportReaderAnnotationsJson(annotationScopeKey, text, annotations, sourceName),
      'application/json',
    );
  };

  const paragraphChunks = useMemo(() => {
    const parts = text.split('\n\n').filter((p) => p.trim());
    let searchFrom = 0;
    return parts.map((p) => {
      const start = text.indexOf(p, searchFrom);
      searchFrom = start + p.length;
      return { paragraph: p, start, end: start + p.length };
    });
  }, [text]);

  const llmReady = isLlmAvailable(userSettings);
  const companionLang = lang;
  const readerSourceText = text;

  const ocrCandidate = useMemo(
    () => needsOcrOverlay(text, sourceName),
    [text, sourceName],
  );
  const [ocrOverlayOn, setOcrOverlayOn] = useState(ocrCandidate);
  useEffect(() => {
    if (ocrCandidate) setOcrOverlayOn(true);
  }, [ocrCandidate, annotationScopeKey]);
  const ocrRegions = useMemo(
    () => (ocrOverlayOn && ocrCandidate ? buildOcrOverlayRegions(text) : []),
    [ocrOverlayOn, ocrCandidate, text],
  );

  useEffect(() => {
    if (translationMode === 'off' || !readerSourceText.trim()) {
      setBilingual([]);
      setTranslating(false);
      return;
    }
    let cancelled = false;
    const glossaryCols = buildGlossaryCompanionColumns(readerSourceText, glossary, concept, focusTerm);

    if (translationMode === 'glossary') {
      setBilingual(glossaryCols);
      setTranslating(false);
      return () => { cancelled = true; };
    }

    setTranslating(true);
    const cached = loadCachedTranslations(annotationScopeKey, readerSourceText, companionLang);
    if (cached && cached.length === glossaryCols.length) {
      setBilingual(mergeFullTranslation(glossaryCols, cached));
      setTranslating(false);
      return () => { cancelled = true; };
    }

    translateParagraphsLlm(
      glossaryCols.map((p) => p.source),
      companionLang,
      userSettings,
      concept,
    ).then((translated) => {
      if (cancelled) return;
      if (translated) {
        saveCachedTranslations(annotationScopeKey, readerSourceText, companionLang, translated);
        setBilingual(mergeFullTranslation(glossaryCols, translated));
      } else {
        setBilingual(glossaryCols);
        setTranslationMode('glossary');
      }
      setTranslating(false);
    });

    return () => { cancelled = true; };
  }, [translationMode, readerSourceText, glossary, concept, focusTerm, annotationScopeKey, companionLang, userSettings]);

  const syncScroll = useCallback((from: HTMLDivElement, to: HTMLDivElement, fromSide: 'source' | 'companion') => {
    if (syncLock.current) return;
    syncLock.current = true;
    const fromSel = fromSide === 'source' ? '[id^="reader-para-src-"]' : '[id^="reader-para-cmp-"]';
    const toSel = fromSide === 'source' ? '[id^="reader-para-cmp-"]' : '[id^="reader-para-src-"]';
    syncBilingualByParagraph(from, to, fromSel, toSel);
    requestAnimationFrame(() => { syncLock.current = false; });
  }, []);

  const onSourceScroll = useCallback(() => {
    const from = sourceScrollRef.current;
    const to = companionScrollRef.current;
    if (from && to) syncScroll(from, to, 'source');
  }, [syncScroll]);

  const onCompanionScroll = useCallback(() => {
    const from = companionScrollRef.current;
    const to = sourceScrollRef.current;
    if (from && to) syncScroll(from, to, 'companion');
  }, [syncScroll]);

  const scrollToParagraph = useCallback((index: number) => {
    const src = sourceScrollRef.current;
    const cmp = companionScrollRef.current;
    if (src && cmp && translationMode !== 'off' && bilingual.length > 0) {
      scrollBothToParagraph(src, cmp, '[id^="reader-para-src-"]', '[id^="reader-para-cmp-"]', index);
      return;
    }
    const el = document.getElementById(`reader-para-body-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [translationMode, bilingual.length]);

  const readAllParagraphs = useCallback(() => {
    ttsRef.current?.stop();
    const paragraphs = translationMode !== 'off' && bilingual.length > 0
      ? bilingual.map((p) => p.source)
      : splitReaderParagraphs(text);
    const ctrl = speakParagraphs(paragraphs, {
      lang,
      rate: dyslexia ? 0.88 : 1,
      onParagraphStart: (i) => {
        setTtsActiveIndex(i);
        scrollToParagraph(i);
      },
      onEnd: () => setTtsActiveIndex(null),
    });
    ttsRef.current = ctrl;
  }, [translationMode, bilingual, text, lang, dyslexia, scrollToParagraph]);

  useEffect(() => () => { ttsRef.current?.stop(); }, []);

  useEffect(() => {
    if (translationMode === 'off' || bilingual.length === 0 || !focusTerm) return;
    const idx = paragraphIndexForTerm(bilingual.map((p) => p.source), focusTerm);
    if (idx >= 0) scrollToParagraph(idx);
  }, [focusTerm, translationMode, bilingual, scrollToParagraph]);

  const renderAnnotatedSlice = (slice: string, rangeStart: number, keyPrefix: string) => {
    const segments = segmentAnnotatedRange(text, annotations, rangeStart, rangeStart + slice.length);
    return segments.map((seg, i) => {
      const chunk = slice.slice(seg.start - rangeStart, seg.end - rangeStart);
      if (seg.annotation) {
        return (
          <mark
            key={`${keyPrefix}-${i}`}
            style={{ backgroundColor: `${seg.annotation.color}33`, boxShadow: `inset 0 -2px 0 ${seg.annotation.color}` }}
            className="rounded px-0.5"
            title={seg.annotation.note}
          >
            {chunk}
          </mark>
        );
      }
      return <span key={`${keyPrefix}-${i}`}>{chunk}</span>;
    });
  };

  const renderWord = (word: string, key: string, rangeStart: number, wordStartInSlice: number) => {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, '');
    const focused = focusTerm && clean.length >= 3
      && normalizeFocusTerm(clean).includes(normalizeFocusTerm(focusTerm).split(' ')[0] ?? '');
    const clickable = onTermFocus && clean.length >= 4 && !annotateMode;

    const absStart = rangeStart + wordStartInSlice;
    const absEnd = absStart + word.length;
    const hasAnn = annotations.some((a) => a.charEnd > absStart && a.charStart < absEnd);

    const inner = bionic ? (
      <>
        <strong className="font-bold">{word.slice(0, Math.ceil(word.length / 2))}</strong>
        <span className="opacity-80">{word.slice(Math.ceil(word.length / 2))}</span>
      </>
    ) : (
      word
    );

    const wrapped = hasAnn ? (
      <mark className="rounded bg-brand-500/15 px-0.5">{inner}</mark>
    ) : inner;

    if (!clickable && !focused) return <span key={key}>{wrapped}</span>;

    return (
      <button
        key={key}
        type="button"
        onClick={() => clickable && onTermFocus(clean)}
        className={cn(
          'inline rounded px-0.5 transition-colors',
          focused && 'bg-brand-500/25 text-brand-200 ring-1 ring-brand-400/30',
          clickable && !focused && 'hover:bg-surface-hover cursor-pointer',
        )}
      >
        {wrapped}
      </button>
    );
  };

  if (!text.trim()) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to read your material with bionic and complexity highlighting.'}
        onUpload={onUpload}
      />
    );
  }

  const renderHighlightedBody = () => {
    if (!highlight) return null;
    const start = Math.max(0, Math.min(highlight.charStart, text.length));
    const end = Math.max(start, Math.min(highlight.charEnd, text.length));
    return (
      <div className={cn('text-[15px] text-text-primary whitespace-pre-wrap', dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed')}>
        {renderAnnotatedSlice(text.slice(0, start), 0, 'pre')}
        <mark ref={markRef} className="rounded bg-brand-500/25 px-0.5 text-text-primary ring-1 ring-brand-400/40">
          {text.slice(start, end)}
        </mark>
        {renderAnnotatedSlice(text.slice(end), end, 'post')}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="cognitive-reader">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-surface-card px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Type className="w-3.5 h-3.5 text-brand-400" />
          {t('cognitiveReader')}
          {annotations.length > 0 && (
            <span className="text-[10px] font-normal text-text-muted">{annotations.length} notes</span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAnnotateMode(!annotateMode)}
            className={cn(
              'rounded-lg border px-2 py-1 text-[10px] font-medium flex items-center gap-1',
              annotateMode ? 'border-accent-amber/30 bg-accent-amber/15 text-accent-amber' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
            )}
          >
            <Highlighter className="w-3 h-3" />
            {lang === 'el' ? 'Σημείωση' : 'Annotate'}
          </button>
          {annotations.length > 0 && (
            <>
              <button type="button" onClick={exportMarkdown} className="rounded-lg p-1 text-text-muted hover:text-brand-300" title="Export Markdown">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowMargin(!showMargin)}
                className={cn('rounded-lg p-1', showMargin ? 'text-brand-300' : 'text-text-muted')}
              >
                <StickyNote className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button type="button" onClick={() => setDyslexia(!dyslexia)} className={cn('rounded-lg border px-2 py-1 text-[10px] font-medium', dyslexia ? 'border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary')}>
            {lang === 'el' ? 'Δυσλεξία' : 'Dyslexia'}
          </button>
          <button type="button" onClick={speakSelection} className="rounded-lg border border-transparent p-1 text-text-muted hover:text-brand-300" title="Read aloud">
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-testid="reader-tts-paragraphs"
            onClick={readAllParagraphs}
            className={cn(
              'rounded-lg border px-2 py-1 text-[10px] font-medium',
              ttsActiveIndex !== null ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
            )}
          >
            {lang === 'el' ? 'Ανάγνωση' : 'Read all'}
          </button>
          <button
            type="button"
            data-testid="reader-full-source-toggle"
            onClick={() => setFullSource(!fullSource)}
            className={cn('rounded-lg border px-2 py-1 text-[10px]', fullSource ? 'border-brand-500/30 bg-brand-600/15 text-brand-300' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary')}
          >
            {fullSource ? (lang === 'el' ? 'Πλήρες' : 'Full') : (lang === 'el' ? 'Απόσπασμα' : 'Excerpt')}
          </button>
          {text.trim().length > 0 && (
            <button
              type="button"
              data-testid="reader-translation-toggle"
              onClick={() => {
                setTranslationMode((m) => {
                  if (m === 'off') return 'glossary';
                  if (m === 'glossary') return llmReady ? 'full' : 'off';
                  return 'off';
                });
              }}
              className={cn(
                'rounded-lg border px-2 py-1 text-[10px] font-medium flex items-center gap-1',
                translationMode !== 'off'
                  ? 'border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan'
                  : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
              )}
              title={lang === 'el' ? 'Δίγλωσση προβολή' : 'Side-by-side translation'}
            >
              <Languages className="w-3 h-3" />
              {translationMode === 'off'
                ? (lang === 'el' ? 'Μετάφραση' : 'Translate')
                : translationMode === 'glossary'
                  ? (lang === 'el' ? 'Γλωσσάρι' : 'Glossary')
                  : (lang === 'el' ? 'Πλήρης' : 'Full')}
              {translating && '…'}
            </button>
          )}
          <button type="button" onClick={() => setBionic(!bionic)} disabled={!!highlight} className={cn('rounded-lg border px-2 py-1 text-[10px] font-medium disabled:opacity-40', bionic ? 'border-brand-500/30 bg-brand-600/20 text-brand-300' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary')}>
            {t('bionic')}
          </button>
          {ocrCandidate && (
            <button
              type="button"
              data-testid="reader-ocr-overlay-toggle"
              onClick={() => setOcrOverlayOn(!ocrOverlayOn)}
              className={cn(
                'rounded-lg border px-2 py-1 text-[10px] font-medium',
                ocrOverlayOn ? 'border-accent-amber/30 bg-accent-amber/15 text-accent-amber' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
              )}
            >
              {lang === 'el' ? 'OCR overlay' : 'OCR overlay'}
            </button>
          )}
          <button type="button" onClick={() => setHighlightComplexity(!highlightComplexity)} disabled={!!highlight} className={cn('rounded-lg border px-2 py-1 text-[10px] font-medium disabled:opacity-40', highlightComplexity ? 'border-accent-amber/30 bg-accent-amber/20 text-accent-amber' : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary')}>
            {t('heatmap')}
          </button>
        </div>
      </div>

      {annotateMode && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-secondary/40 px-4 py-1.5">
          <span className="text-[10px] text-text-muted">{lang === 'el' ? 'Χρώμα:' : 'Color:'}</span>
          {ANN_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setActiveColor(c)} className={cn('h-4 w-4 rounded-full border-2', activeColor === c ? 'border-white' : 'border-transparent')} style={{ backgroundColor: c }} />
          ))}
          <span className="text-[10px] text-text-muted ml-2">{lang === 'el' ? 'Επίλεξε κείμενο για σημείωση' : 'Select text to annotate'}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {highlight ? (
        <div
          ref={bodyRef}
          onMouseUp={handleTextMouseUp}
          className={cn('flex-1 overflow-y-auto bg-surface-primary p-6', dyslexia && 'font-sans', annotateMode && 'select-text')}
        >
          {renderHighlightedBody()}
        </div>
        ) : translationMode !== 'off' && bilingual.length > 0 ? (
          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2" data-testid="reader-bilingual-sync">
            <div
              ref={sourceScrollRef}
              onScroll={onSourceScroll}
              className="overflow-y-auto border-r border-border-subtle/60 bg-surface-primary p-4 md:p-6"
            >
              <p className="sticky top-0 z-10 mb-2 bg-surface-primary/90 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted backdrop-blur-sm">
                {lang === 'el' ? 'Πηγή' : 'Source'}
              </p>
              <div className="space-y-4">
                {bilingual.map((pair, i) => (
                  <p
                    key={`src-${i}`}
                    id={`reader-para-src-${i}`}
                    data-testid={`reader-para-sync-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToParagraph(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter') scrollToParagraph(i); }}
                    className={cn(
                      'rounded-lg p-2 text-[15px] leading-relaxed text-text-primary scroll-mt-4 cursor-pointer hover:bg-surface-hover/40',
                      dyslexia && 'leading-loose tracking-wide',
                      focusTerm && pair.source.toLowerCase().includes(focusTerm.toLowerCase()) && 'ring-1 ring-brand-500/40 bg-brand-600/10',
                      ttsActiveIndex === i && 'ring-2 ring-accent-cyan/50 bg-accent-cyan/10',
                    )}
                  >
                    {pair.source}
                  </p>
                ))}
              </div>
            </div>
            <div
              ref={companionScrollRef}
              onScroll={onCompanionScroll}
              className="overflow-y-auto bg-surface-secondary/40 p-4 md:p-6"
            >
              <p className="sticky top-0 z-10 mb-2 bg-surface-primary/90 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-cyan backdrop-blur-sm">
                {translationMode === 'full'
                  ? (lang === 'el' ? 'Μετάφραση' : 'Translation')
                  : (lang === 'el' ? 'Γλωσσάρι / ορισμοί' : 'Glossary companion')}
              </p>
              <div className="space-y-4">
                {bilingual.map((pair, i) => (
                  <p
                    key={`cmp-${i}`}
                    id={`reader-para-cmp-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToParagraph(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter') scrollToParagraph(i); }}
                    className={cn(
                      'rounded-lg border border-border-subtle/50 bg-surface-card/40 p-2 text-sm text-text-primary scroll-mt-4 cursor-pointer hover:bg-surface-hover/30',
                      dyslexia && 'leading-loose tracking-wide',
                      focusTerm && pair.source.toLowerCase().includes(focusTerm.toLowerCase()) && 'ring-1 ring-accent-cyan/40',
                    )}
                  >
                    {pair.companion}
                    {pair.glossHits.length > 0 && (
                      <span className="mt-1 block text-[9px] text-text-muted">
                        {pair.glossHits.slice(0, 4).join(' · ')}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
        <div
          ref={bodyRef}
          onMouseUp={handleTextMouseUp}
          className={cn('relative flex-1 overflow-y-auto bg-surface-primary p-6', dyslexia && 'font-sans', annotateMode && 'select-text')}
        >
          {ocrRegions.length > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              data-testid="reader-ocr-overlay"
              aria-hidden
            >
              {ocrRegions.map((r) => (
                <div
                  key={r.id}
                  className="absolute rounded border border-accent-amber/50 bg-accent-amber/10"
                  style={{
                    left: `${r.left}%`,
                    top: `${r.top}%`,
                    width: `${r.width}%`,
                    height: `${r.height}%`,
                  }}
                  title={r.text.slice(0, 80)}
                />
              ))}
            </div>
          )}
          {fullSource ? (
            <div className={cn('text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap', dyslexia && 'leading-loose tracking-wide')}>
              {renderAnnotatedSlice(text, 0, 'full')}
            </div>
          ) : (
            <div className="w-full space-y-4">
              {paragraphChunks.map(({ paragraph, start }, i) => {
                const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
                const isComplex = wordCount > complexityThreshold;
                const words = paragraph.split(/(\s+)/);
                let charInPara = 0;
                return (
                  <p
                    key={i}
                    id={`reader-para-body-${i}`}
                    className={cn(
                      'rounded-lg p-2 text-[15px] transition-colors',
                      dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed',
                      highlightComplexity
                        ? isComplex ? 'border-l-2 border-accent-rose bg-accent-rose/10 text-text-primary' : 'text-text-secondary'
                        : 'text-text-primary',
                      ttsActiveIndex === i && 'ring-2 ring-accent-cyan/40 bg-accent-cyan/10',
                    )}
                  >
                    {words.map((w, j) => {
                      const pos = charInPara;
                      charInPara += w.length;
                      if (!w.trim()) return <span key={`${i}-${j}`}>{w}</span>;
                      return renderWord(w, `${i}-${j}`, start, pos);
                    })}
                  </p>
                );
              })}
            </div>
          )}
          {highlightComplexity && !highlight && (
            <div className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-lg border border-accent-rose/20 bg-accent-rose/5 p-3 text-xs text-accent-rose">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{lang === 'el' ? 'Πυκνή ορολογία — άνοιξε χάρτη ή πρόσθεσε σημείωση.' : 'Dense terminology — open concept map or add a note.'}</span>
            </div>
          )}
        </div>
        )}

        {showMargin && annotations.length > 0 && (
          <aside className="hidden sm:block w-44 shrink-0 border-l border-border-subtle overflow-y-auto p-2 space-y-2 bg-surface-card/50">
            <p className="text-[10px] font-semibold text-text-muted px-1">{lang === 'el' ? 'Περιθώρια' : 'Margin'}</p>
            {annotations.map((ann) => (
              <div key={ann.id} className="rounded-lg border border-border-subtle p-2 text-[10px] group relative" style={{ borderLeftColor: ann.color, borderLeftWidth: 3 }}>
                <button type="button" onClick={() => removeAnnotation(ann.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-text-muted">
                  <X className="w-3 h-3" />
                </button>
                <p className="text-text-secondary line-clamp-2 italic">
                  "{text.slice(ann.charStart, ann.charEnd).slice(0, 60)}{ann.charEnd - ann.charStart > 60 ? '…' : ''}"
                </p>
                {ann.note && <p className="text-text-primary mt-1">{ann.note}</p>}
              </div>
            ))}
            <button type="button" onClick={exportJson} className="w-full text-[9px] text-brand-400 hover:text-brand-300 py-1">
              JSON export
            </button>
          </aside>
        )}
      </div>

      {pendingNote && (
        <div className="shrink-0 border-t border-border-subtle bg-surface-card p-3 space-y-2">
          <p className="text-[10px] text-text-muted">{lang === 'el' ? 'Επιλεγμένο:' : 'Selected:'} <span className="italic text-text-secondary">"{pendingNote.excerpt.slice(0, 80)}"</span></p>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={lang === 'el' ? 'Προαιρετική σημείωση…' : 'Optional margin note…'}
            className="w-full px-3 py-1.5 rounded-lg bg-surface-input border border-border-subtle text-xs"
            onKeyDown={(e) => e.key === 'Enter' && confirmAnnotation()}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setPendingNote(null)} className="text-xs text-text-muted">{t('cancel')}</button>
            <button type="button" onClick={confirmAnnotation} className="text-xs font-medium text-brand-300">{lang === 'el' ? 'Αποθήκευση' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
