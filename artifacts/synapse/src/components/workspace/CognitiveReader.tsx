import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Sparkles, Type, Volume2, Highlighter, Download, StickyNote, X, Languages, BookOpen, AlertTriangle } from 'lucide-react';
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
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import type { WorkspaceSelectionActionId, WorkspaceSelectionContext } from '../../lib/workspaceSelectionActions';
import { FrontMatterCard } from './FrontMatterCard';
import { BibliographyBlock } from './BibliographyBlock';
import { FormulaLatexPreview } from './FormulaLatexPreview';
import { RichText } from '../RichText';
import type { GlossaryEntry, UserSettings } from '../../types';
import {
  buildGlossaryCompanionColumns,
  loadCachedTranslations,
  mergeFullTranslation,
  saveCachedTranslations,
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
import { buildOcrOverlayRegions, isLowConfidenceRegion, needsOcrOverlay } from '../../lib/readerOcrOverlay';
import type { OcrStoredRegion } from '../../lib/readerOcrOverlay';
import { applyOcrCorrectionsToText } from '../../lib/readerOcrCorrectionStore';
import { OcrCorrectionPanel } from './OcrCorrectionPanel';
import { isLlmAvailable } from '../../lib/llmClient';
import {
  buildReaderSegments,
  readerSegmentsToParagraphs,
} from '../../lib/readerDocumentLayout';
import { findSuspiciousReaderSegments } from '../../lib/readerSuspiciousFragments';
import { findGlossaryTermMatch } from '../../lib/readerGlossaryMatch';
import { isBibliographyHeading } from '../../lib/readerBibliography';
import { hasInlineMath } from '../../lib/readerMathBlocks';
import {
  buildReaderSectionNavFromSegments,
  sectionNavRailLabel,
} from '../../lib/readerSectionNav';
import type { ConceptBusState } from '../../lib/workspaceConceptBus';
import {
  buildReaderLearningHeatmap,
  readerHeatmapLevelClass,
  type ReaderSegmentHeat,
} from '../../lib/readerLearningHeatmap';
import type { ReaderStepHeatSyncSummary } from '../../lib/readerHeatmapStepSyncQA';
import { ReaderStepHeatSyncStrip } from './ReaderStepHeatSyncStrip';

type ReaderHeatmapMode = 'off' | 'learning' | 'complexity';

const ANN_COLORS = ['#818cf8', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];

interface Props {
  text?: string;
  complexityThreshold?: number;
  emptyMessage?: string;
  hasSource?: boolean;
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
  /** Full analyzed source — preserves paragraphs/sections (default Reader view). */
  sourceFullText?: string;
  /** Lesson rail → scroll to matching heading segment */
  scrollToSegmentIndex?: number | null;
  scrollToSegmentStepIndex?: number;
  /** Reader section nav → highlight matching lesson step */
  onSectionNavSelect?: (label: string) => void;
  onSectionStudy?: (label: string) => void;
  onSectionAskAgent?: (label: string) => void;
  /** §13.5 unified selection-action contract (replaces ask-agent-only bar). */
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  /** @deprecated Use onSelectionAction */
  onAskAgentAboutSelection?: (text: string, sectionLabel?: string) => void;
  /** Server OCR bounding boxes from upload, when available. */
  ocrRegions?: OcrStoredRegion[];
  conceptBus?: ConceptBusState;
  stepMarks?: Record<number, 'understood' | 'confusing'>;
  stepTitles?: string[];
  stepToSegmentIndex?: Record<number, number>;
  /** Wave 6.8a — active lesson step ↔ reader segment ↔ heat sync */
  stepHeatSync?: ReaderStepHeatSyncSummary | null;
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
  hasSource = false,
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
  sourceFullText,
  scrollToSegmentIndex,
  scrollToSegmentStepIndex,
  onSectionNavSelect,
  onSectionStudy,
  onSectionAskAgent,
  onSelectionAction,
  onAskAgentAboutSelection,
  ocrRegions,
  conceptBus,
  stepMarks,
  stepTitles,
  stepToSegmentIndex,
  stepHeatSync,
}: Props) {
  const { t } = useI18n();
  const [bionic, setBionic] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<ReaderHeatmapMode>('off');
  const [dyslexia, setDyslexia] = useState(false);
  const [fullSource, setFullSource] = useState(true);
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
  const [glossaryPopover, setGlossaryPopover] = useState<{ term: string; definition: string } | null>(null);
  const markRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const companionScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);
  const ttsRef = useRef<ReturnType<typeof speakParagraphs> | null>(null);
  const [ttsActiveIndex, setTtsActiveIndex] = useState<number | null>(null);

  const [ocrCorrectionRevision, setOcrCorrectionRevision] = useState(0);
  const [activeSectionLabel, setActiveSectionLabel] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<string | null>(null);
  const rawDisplayText = fullSource ? (sourceFullText?.trim() || text) : text;
  const displayText = useMemo(
    () => applyOcrCorrectionsToText(rawDisplayText ?? '', annotationScopeKey ?? ''),
    [rawDisplayText, annotationScopeKey, ocrCorrectionRevision],
  );

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
    setPendingNote({ start, end, excerpt: displayText.slice(start, end) });
    setNoteDraft('');
  }, [annotateMode, displayText]);

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
      exportReaderAnnotationsMarkdown(displayText, annotations, sourceName),
      'text/markdown',
    );
  };

  const exportJson = () => {
    downloadBlob(
      `reader-annotations-${annotationScopeKey}.json`,
      exportReaderAnnotationsJson(annotationScopeKey, displayText, annotations, sourceName),
      'application/json',
    );
  };

  const readerSegments = useMemo(
    () => buildReaderSegments(displayText),
    [displayText],
  );

  const learningHeatmap = useMemo(
    () => buildReaderLearningHeatmap({
      segments: readerSegments,
      conceptBus,
      primaryConcept: concept,
      stepMarks,
      stepTitles,
      stepToSegmentIndex,
    }),
    [readerSegments, conceptBus, concept, stepMarks, stepTitles, stepToSegmentIndex],
  );

  const learningHeatBySegment = useMemo(() => {
    const map = new Map<number, ReaderSegmentHeat>();
    for (const row of learningHeatmap) map.set(row.segmentIndex, row);
    return map;
  }, [learningHeatmap]);

  const hasLearningHeat = useMemo(
    () => learningHeatmap.some((h) => h.level !== 'none'),
    [learningHeatmap],
  );

  const suspiciousSegments = useMemo(
    () => findSuspiciousReaderSegments(displayText),
    [displayText],
  );
  const suspiciousIndexSet = useMemo(
    () => new Set(suspiciousSegments.map((s) => s.index)),
    [suspiciousSegments],
  );

  const paragraphChunks = useMemo(
    () => readerSegmentsToParagraphs(readerSegments),
    [readerSegments],
  );

  const llmReady = isLlmAvailable(userSettings);
  const companionLang = lang;
  const readerSourceText = displayText;

  const ocrCandidate = useMemo(
    () => needsOcrOverlay(text, sourceName) || (ocrRegions?.length ?? 0) > 0,
    [text, sourceName, ocrRegions],
  );
  const [ocrOverlayOn, setOcrOverlayOn] = useState(ocrCandidate);
  useEffect(() => {
    if (ocrCandidate) setOcrOverlayOn(true);
  }, [ocrCandidate, annotationScopeKey]);
  const overlayRegions = useMemo(
    () => (ocrOverlayOn && ocrCandidate ? buildOcrOverlayRegions(text, 0, ocrRegions) : []),
    [ocrOverlayOn, ocrCandidate, text, ocrRegions],
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

  const sectionNav = useMemo(
    () => buildReaderSectionNavFromSegments(readerSegments),
    [readerSegments],
  );

  const scrollToSection = useCallback((segmentIndex: number) => {
    const el = document.getElementById(`reader-seg-${segmentIndex}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (scrollToSegmentIndex == null || scrollToSegmentIndex < 0) return;
    scrollToSection(scrollToSegmentIndex);
    const match = sectionNav.find((n) => n.segmentIndex === scrollToSegmentIndex);
    if (match) setActiveSectionLabel(match.label);
  }, [scrollToSegmentIndex, scrollToSegmentStepIndex, scrollToSection, sectionNav]);

  const captureReaderSelection = useCallback(() => {
    if (annotateMode) return;
    const sel = window.getSelection()?.toString().trim();
    setTextSelection(sel && sel.length >= 8 ? sel : null);
  }, [annotateMode]);

  const dismissTextSelection = useCallback(() => {
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleReaderSelectionAction = useCallback((action: WorkspaceSelectionActionId) => {
    if (!textSelection) return;
    if (action === 'annotate') {
      const start = displayText.indexOf(textSelection);
      if (start >= 0) {
        setPendingNote({
          start,
          end: start + textSelection.length,
          excerpt: textSelection,
        });
        setNoteDraft('');
        setAnnotateMode(true);
      }
      dismissTextSelection();
      return;
    }
    const ctx: WorkspaceSelectionContext = {
      text: textSelection,
      term: (focusTerm ?? concept ?? textSelection).trim().slice(0, 80),
      sectionLabel: activeSectionLabel ?? undefined,
      originTool: 'reader',
    };
    if (onSelectionAction) {
      onSelectionAction(action, ctx);
    } else if (action === 'ask-agent' && onAskAgentAboutSelection) {
      onAskAgentAboutSelection(textSelection, activeSectionLabel ?? undefined);
    }
    dismissTextSelection();
  }, [
    textSelection, displayText, focusTerm, concept, activeSectionLabel,
    onSelectionAction, onAskAgentAboutSelection, dismissTextSelection,
  ]);

  const readAllParagraphs = useCallback(() => {
    ttsRef.current?.stop();
    const paragraphs = translationMode !== 'off' && bilingual.length > 0
      ? bilingual.map((p) => p.source)
      : paragraphChunks.map((p) => p.paragraph);
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
  }, [translationMode, bilingual, paragraphChunks, lang, dyslexia, scrollToParagraph]);

  useEffect(() => () => { ttsRef.current?.stop(); }, []);

  useEffect(() => {
    if (translationMode === 'off' || bilingual.length === 0 || !focusTerm) return;
    const idx = paragraphIndexForTerm(bilingual.map((p) => p.source), focusTerm);
    if (idx >= 0) scrollToParagraph(idx);
  }, [focusTerm, translationMode, bilingual, scrollToParagraph]);

  const renderAnnotatedSlice = (slice: string, rangeStart: number, keyPrefix: string) => {
    const segments = segmentAnnotatedRange(displayText, annotations, rangeStart, rangeStart + slice.length);
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
    const glossaryHit = glossary.length > 0 ? findGlossaryTermMatch(clean, glossary) : undefined;
    const focused = focusTerm && clean.length >= 3
      && normalizeFocusTerm(clean).includes(normalizeFocusTerm(focusTerm).split(' ')[0] ?? '');
    const clickable = (onTermFocus || glossaryHit) && clean.length >= 4 && !annotateMode;

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
        onClick={() => {
          if (glossaryHit) {
            setGlossaryPopover({
              term: glossaryHit.term,
              definition: glossaryHit.definition?.trim() || '',
            });
            return;
          }
          if (onTermFocus) onTermFocus(clean);
        }}
        className={cn(
          'inline rounded px-0.5 transition-colors',
          glossaryHit && 'underline decoration-accent-cyan/40 decoration-dotted',
          focused && 'bg-brand-500/25 text-brand-200 ring-1 ring-brand-400/30',
          clickable && !focused && 'hover:bg-surface-hover cursor-pointer',
        )}
      >
        {wrapped}
      </button>
    );
  };

  const cycleHeatmapMode = () => {
    setHeatmapMode((mode) => {
      if (mode === 'off') return hasLearningHeat ? 'learning' : 'complexity';
      if (mode === 'learning') return 'complexity';
      return 'off';
    });
  };

  const heatmapActive = heatmapMode !== 'off';

  if (!displayText.trim() && !text.trim()) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to read your material with bionic and complexity highlighting.'}
        hasSource={hasSource}
        onUpload={onUpload}
      />
    );
  }

  const renderParagraphWords = (paragraph: string, rangeStart: number, bodyIndex: number, segmentIndex?: number) => {
    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
    const isComplex = wordCount > complexityThreshold;
    const learningHeat = segmentIndex != null ? learningHeatBySegment.get(segmentIndex) : undefined;
    const words = paragraph.split(/(\s+)/);
    let charInPara = 0;
    return (
      <p
        id={`reader-para-body-${bodyIndex}`}
        className={cn(
          'rounded-lg p-2 text-[15px] transition-colors',
          dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed',
          heatmapMode === 'complexity'
            ? isComplex ? 'border-l-2 border-accent-rose bg-accent-rose/10 text-text-primary' : 'text-text-secondary'
            : heatmapMode === 'learning' && learningHeat
              ? readerHeatmapLevelClass(learningHeat.level)
              : 'text-text-primary',
          ttsActiveIndex === bodyIndex && 'ring-2 ring-accent-cyan/40 bg-accent-cyan/10',
        )}
        title={heatmapMode === 'learning' && learningHeat?.reasons.length ? learningHeat.reasons.join(' · ') : undefined}
      >
        {words.map((w, j) => {
          const pos = charInPara;
          charInPara += w.length;
          if (!w.trim()) return <span key={`${bodyIndex}-${j}`}>{w}</span>;
          return renderWord(w, `${bodyIndex}-${j}`, rangeStart, pos);
        })}
      </p>
    );
  };

  const renderStructuredBody = () => {
    let bodyIndex = 0;
    return (
      <div className="w-full space-y-3" data-testid="reader-structured-body">
        {readerSegments.map((seg, i) => {
          if (seg.kind === 'heading') {
            const suspicious = suspiciousIndexSet.has(i);
            const learningHeat = learningHeatBySegment.get(i);
            return (
              <h3
                key={`seg-${i}`}
                id={`reader-seg-${i}`}
                className={cn(
                  'scroll-mt-4 border-b pb-1 pt-2 text-sm font-semibold uppercase tracking-wide',
                  heatmapMode === 'learning' && learningHeat
                    ? readerHeatmapLevelClass(learningHeat.level)
                    : suspicious
                      ? 'border-accent-amber/40 text-accent-amber'
                      : 'border-border-subtle/60 text-brand-300',
                )}
                title={heatmapMode === 'learning' && learningHeat?.reasons.length ? learningHeat.reasons.join(' · ') : undefined}
                data-suspicious-fragment={suspicious ? 'true' : undefined}
                data-reader-heat={learningHeat?.level ?? 'none'}
              >
                {suspicious && (
                  <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 shrink-0 align-text-bottom" aria-hidden />
                )}
                {seg.content}
                {suspicious && (
                  <span className="ml-2 block text-[10px] font-normal normal-case tracking-normal text-accent-amber/80">
                    {lang === 'el'
                      ? 'Πιθανό σφάλμα εξαγωγής — επαλήθευσε με την πρωτότυπη πηγή'
                      : 'Possible extraction error — verify against your source'}
                  </span>
                )}
              </h3>
            );
          }
          if (seg.kind === 'front-matter' && seg.listItems && seg.listItems.length > 0) {
            return (
              <FrontMatterCard
                key={`seg-${i}`}
                items={seg.listItems}
                lang={lang}
              />
            );
          }
          if (seg.kind === 'bibliography' && seg.listItems && seg.listItems.length > 0) {
            const bibHeading = readerSegments[i - 1]?.kind === 'heading'
              ? readerSegments[i - 1]!.content
              : undefined;
            return (
              <BibliographyBlock
                key={`seg-${i}`}
                title={isBibliographyHeading(bibHeading) ? bibHeading : undefined}
                items={seg.listItems}
                lang={lang}
              />
            );
          }
          if (seg.kind === 'list' && seg.listItems && seg.listItems.length > 0) {
            const idx = bodyIndex++;
            const ListTag = seg.listOrdered ? 'ol' : 'ul';
            return (
              <ListTag
                key={`seg-${i}`}
                id={`reader-para-body-${idx}`}
                className={cn(
                  'space-y-1.5 rounded-lg border border-border-subtle/40 bg-surface-card/30 px-5 py-3 text-[15px] text-text-primary',
                  seg.listOrdered ? 'list-decimal pl-8' : 'list-disc pl-5',
                )}
              >
                {seg.listItems.map((item, li) => (
                  <li
                    key={li}
                    className={cn(
                      'whitespace-pre-line',
                      dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed',
                    )}
                  >
                    {item}
                  </li>
                ))}
              </ListTag>
            );
          }
          if (seg.kind === 'table' && seg.table) {
            const idx = bodyIndex++;
            const { headers, rows, title } = seg.table;
            return (
              <div
                key={`seg-${i}`}
                id={`reader-seg-${i}`}
                className="overflow-x-auto rounded-lg border border-border-subtle/50 bg-surface-card/40"
                data-testid="reader-table-segment"
              >
                {title && (
                  <p className="border-b border-border-subtle/40 px-3 py-2 text-[11px] font-semibold text-text-secondary">
                    {title}
                  </p>
                )}
                <table id={`reader-para-body-${idx}`} className="min-w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border-subtle/60 bg-surface-secondary/50">
                      {headers.map((h, hi) => (
                        <th key={hi} className="px-3 py-2 font-semibold text-brand-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border-subtle/30 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-text-primary align-top">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (seg.kind === 'math' && seg.mathLatex) {
            const idx = bodyIndex++;
            return (
              <div
                key={`seg-${i}`}
                id={`reader-para-body-${idx}`}
                className="rounded-lg border border-border-subtle/40 bg-surface-card/30 px-4 py-3"
                data-testid="reader-math-segment"
              >
                <FormulaLatexPreview formula={seg.mathLatex} display />
              </div>
            );
          }
          const idx = bodyIndex++;
          if (seg.kind === 'paragraph' && hasInlineMath(seg.content)) {
            return (
              <div
                key={`seg-${i}`}
                id={`reader-para-body-${idx}`}
                className={cn(
                  'rounded-lg p-2 text-[15px] text-text-primary',
                  dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed',
                  ttsActiveIndex === idx && 'ring-2 ring-accent-cyan/40 bg-accent-cyan/10',
                )}
              >
                <RichText text={seg.content} />
              </div>
            );
          }
          return (
            <div key={`seg-${i}`} id={`reader-seg-${i}`}>
              {renderParagraphWords(seg.content, seg.charStart, idx, i)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHighlightedBody = () => {
    if (!highlight) return null;
    const start = Math.max(0, Math.min(highlight.charStart, displayText.length));
    const end = Math.max(start, Math.min(highlight.charEnd, displayText.length));
    return (
      <div className={cn('text-[15px] text-text-primary whitespace-pre-wrap', dyslexia ? 'leading-loose tracking-wide' : 'leading-relaxed')}>
        {renderAnnotatedSlice(displayText.slice(0, start), 0, 'pre')}
        <mark ref={markRef} className="rounded bg-brand-500/25 px-0.5 text-text-primary ring-1 ring-brand-400/40">
          {displayText.slice(start, end)}
        </mark>
        {renderAnnotatedSlice(displayText.slice(end), end, 'post')}
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
          <button
            type="button"
            data-testid="reader-heatmap-toggle"
            onClick={cycleHeatmapMode}
            disabled={!!highlight}
            className={cn(
              'rounded-lg border px-2 py-1 text-[10px] font-medium disabled:opacity-40',
              heatmapActive
                ? heatmapMode === 'learning'
                  ? 'border-accent-rose/30 bg-accent-rose/20 text-accent-rose'
                  : 'border-accent-amber/30 bg-accent-amber/20 text-accent-amber'
                : 'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
            )}
            title={
              heatmapMode === 'learning'
                ? (lang === 'el' ? 'Heatmap αδυναμιών (Concept Bus)' : 'Weak-area heatmap (Concept Bus)')
                : heatmapMode === 'complexity'
                  ? (lang === 'el' ? 'Heatmap πυκνότητας όρων' : 'Term density heatmap')
                  : (lang === 'el' ? 'Heatmap μελέτης' : 'Study heatmap')
            }
          >
            {heatmapMode === 'learning'
              ? (lang === 'el' ? 'Αδυναμίες' : 'Weak spots')
              : heatmapMode === 'complexity'
                ? t('heatmap')
                : t('heatmap')}
          </button>
        </div>
      </div>

      {stepHeatSync && (
        <ReaderStepHeatSyncStrip
          summary={stepHeatSync}
          lang={lang}
          onJumpToSegment={
            stepHeatSync.segmentIndex != null
              ? () => {
                  const el = document.getElementById(`reader-seg-${stepHeatSync.segmentIndex}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              : undefined
          }
        />
      )}

      {suspiciousSegments.length > 0 && (
        <div
          className="flex shrink-0 flex-col gap-2 border-b border-accent-amber/30 bg-accent-amber/10 px-4 py-2"
          data-testid="reader-suspicious-banner"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
            <p className="text-[11px] text-accent-amber">
              {lang === 'el'
                ? `${suspiciousSegments.length} ενότητ${suspiciousSegments.length === 1 ? 'α' : 'ες'} με πιθανό σφάλμα OCR/εξαγωγής — μην τις χρησιμοποιείς ως αυθεντικές χωρίς επαλήθευση.`
                : `${suspiciousSegments.length} section${suspiciousSegments.length === 1 ? '' : 's'} may contain OCR/extraction errors — do not treat as authoritative without verification.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-6" data-testid="reader-suspicious-jumps">
            {suspiciousSegments.map((seg) => (
              <button
                key={seg.index}
                type="button"
                data-testid={`reader-suspicious-jump-${seg.index}`}
                onClick={() => scrollToSection(seg.index)}
                className="rounded-full border border-accent-amber/40 bg-accent-amber/10 px-2 py-0.5 text-[9px] text-accent-amber hover:bg-accent-amber/20"
              >
                {seg.label.slice(0, 48)}{seg.label.length > 48 ? '…' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {glossaryPopover && (
        <div
          className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-cyan/25 bg-accent-cyan/8 px-4 py-2"
          data-testid="reader-glossary-popover"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-accent-cyan">{glossaryPopover.term}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {glossaryPopover.definition || (lang === 'el' ? 'Δεν υπάρχει ορισμός στο γλωσσάρι.' : 'No glossary definition.')}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {onTermFocus && (
              <button
                type="button"
                onClick={() => {
                  onTermFocus(glossaryPopover.term);
                  setGlossaryPopover(null);
                }}
                className="rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1 text-[9px] font-medium text-brand-300"
              >
                {lang === 'el' ? 'Εστίαση' : 'Focus'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setGlossaryPopover(null)}
              className="rounded p-1 text-text-muted hover:text-text-primary"
              aria-label={lang === 'el' ? 'Κλείσιμο' : 'Dismiss'}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {annotateMode && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-secondary/40 px-4 py-1.5">
          <span className="text-[10px] text-text-muted">{lang === 'el' ? 'Χρώμα:' : 'Color:'}</span>
          {ANN_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setActiveColor(c)} className={cn('h-4 w-4 rounded-full border-2', activeColor === c ? 'border-white' : 'border-transparent')} style={{ backgroundColor: c }} />
          ))}
          <span className="text-[10px] text-text-muted ml-2">{lang === 'el' ? 'Επίλεξε κείμενο για σημείωση' : 'Select text to annotate'}</span>
        </div>
      )}

      {sectionNav.length >= 2 && (
        <div
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border-subtle bg-surface-secondary/40 px-3 py-2 hide-scrollbar"
          data-testid="reader-section-nav"
        >
          <span className="shrink-0 self-center text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            {sectionNavRailLabel(sectionNav, lang)}
          </span>
          {sectionNav.map((item) => {
            const isActive = scrollToSegmentIndex != null && item.segmentIndex === scrollToSegmentIndex;
            return (
            <button
              key={item.segmentIndex}
              type="button"
              data-testid={isActive ? `reader-section-nav-active-${item.segmentIndex}` : `reader-section-nav-${item.segmentIndex}`}
              onClick={() => {
                scrollToSection(item.segmentIndex);
                setActiveSectionLabel(item.label);
                onSectionNavSelect?.(item.label);
              }}
              className={cn(
                'shrink-0 max-w-[140px] truncate rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                isActive
                  ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan font-medium'
                  : 'border-white/10 bg-surface-card text-text-secondary hover:border-brand-400/40 hover:text-brand-200',
              )}
              title={item.label}
              aria-current={isActive ? 'true' : undefined}
            >
              {item.label.slice(0, 36)}
            </button>
            );
          })}
        </div>
      )}

      {activeSectionLabel && (onSectionStudy || onSectionAskAgent) && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-secondary/30 px-3 py-1.5"
          data-testid="reader-section-actions"
        >
          <span className="max-w-[180px] truncate text-[10px] text-text-muted" title={activeSectionLabel}>
            {activeSectionLabel.slice(0, 40)}
          </span>
          {onSectionStudy && (
            <button
              type="button"
              data-testid="reader-section-study"
              onClick={() => onSectionStudy(activeSectionLabel)}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1 text-[10px] font-medium text-brand-300 hover:bg-brand-600/15"
            >
              <BookOpen className="h-3 w-3" />
              {lang === 'el' ? 'Μελέτη' : 'Study'}
            </button>
          )}
          {onSectionAskAgent && (
            <button
              type="button"
              data-testid="reader-section-ask-agent"
              onClick={() => onSectionAskAgent(activeSectionLabel)}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
            >
              <Sparkles className="h-3 w-3" />
              {lang === 'el' ? 'Ρώτα Agent' : 'Ask Agent'}
            </button>
          )}
        </div>
      )}

      {textSelection && !annotateMode && (onSelectionAction || onAskAgentAboutSelection) && (
        onSelectionAction ? (
          <WorkspaceSelectionActionBar
            lang={lang}
            excerpt={textSelection}
            originTool="reader"
            onAction={handleReaderSelectionAction}
            onDismiss={dismissTextSelection}
            data-testid="reader-selection-actions"
          />
        ) : (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1.5"
          data-testid="reader-selection-ask-agent"
        >
          <span className="flex-1 truncate text-[10px] italic text-text-secondary">
            "{textSelection.slice(0, 72)}{textSelection.length > 72 ? '…' : ''}"
          </span>
          <button
            type="button"
            onClick={() => handleReaderSelectionAction('ask-agent')}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/15 px-2 py-1 text-[10px] font-medium text-accent-cyan"
          >
            <Sparkles className="h-3 w-3" />
            {lang === 'el' ? 'Agent' : 'Ask Agent'}
          </button>
          <button
            type="button"
            onClick={dismissTextSelection}
            className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
            aria-label={lang === 'el' ? 'Κλείσιμο' : 'Dismiss'}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        )
      )}

      {ocrOverlayOn && overlayRegions.length > 0 && annotationScopeKey && (
        <OcrCorrectionPanel
          regions={overlayRegions}
          scopeKey={annotationScopeKey}
          lang={lang}
          onApplied={() => setOcrCorrectionRevision((v) => v + 1)}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {highlight ? (
        <div
          ref={bodyRef}
          onMouseUp={() => {
            handleTextMouseUp();
            captureReaderSelection();
          }}
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
          onMouseUp={() => {
            handleTextMouseUp();
            captureReaderSelection();
          }}
          className={cn('relative flex-1 overflow-y-auto bg-surface-primary p-6', dyslexia && 'font-sans', annotateMode && 'select-text')}
        >
          {overlayRegions.length > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              data-testid="reader-ocr-overlay"
              aria-hidden
            >
              {overlayRegions.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'absolute rounded border',
                    isLowConfidenceRegion(r.confidence)
                      ? 'border-accent-rose/60 bg-accent-rose/15'
                      : 'border-accent-amber/50 bg-accent-amber/10',
                  )}
                  style={{
                    left: `${r.left}%`,
                    top: `${r.top}%`,
                    width: `${r.width}%`,
                    height: `${r.height}%`,
                  }}
                  title={`${r.text.slice(0, 80)} (${Math.round(r.confidence * 100)}%)`}
                />
              ))}
            </div>
          )}
          {renderStructuredBody()}
          {heatmapMode === 'learning' && !highlight && (
            <div className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-lg border border-accent-rose/20 bg-accent-rose/5 p-3 text-xs text-accent-rose" data-testid="reader-learning-heatmap-legend">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'el'
                  ? 'Κόκκινο/πορτοκαλί = πραγματικές αδυναμίες από Concept Bus (λάθη κουίζ, μπερδευτικά, δύσκολες κάρτες).'
                  : 'Rose/amber = real weak spots from Concept Bus (quiz mistakes, confusing marks, hard cards).'}
              </span>
            </div>
          )}
          {heatmapMode === 'complexity' && !highlight && (
            <div className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-3 text-xs text-accent-amber">
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
