import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Pin, X, Tag, Wand2, BookOpen, AlertTriangle, FileText } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import {
  exportAnnotationsJson,
  exportAnnotationsMarkdown,
  loadAnnotations,
  saveAnnotations,
  type StoredAnnotation,
  type AnnotationCategory,
} from '../../lib/annotationStore';
import {
  buildAnnotationAnchor,
  countAnnotationsNeedingReview,
  normalizeAnnotationAnchorStatus,
  type AnnotationCreatedPayload,
} from '../../lib/annotationAnchor';
import type { SharedAnnotationDto } from '../../lib/authClient';
import { termMatchesFocus } from '../../lib/workspaceFocus';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { AnnotationRemapPanel } from './AnnotationRemapPanel';
import { AnnotationToolbar, ANNOTATION_COLORS, SEMANTIC_CATEGORIES } from './AnnotationToolbar';
import { AnnotationMarginRail } from './AnnotationMarginRail';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import {
  autoRemapAnnotations,
  buildAnnotationRemapPlan,
  confirmLegacyAnnotationAtLine,
  remapAnnotationToLine,
} from '../../lib/annotationAnchorRemap';
import {
  auditAnnotationRemapEdgeCases,
  formatRemapEdgeCaseBanner,
} from '../../lib/annotationRemapEdgeCasesQA';
import { UiIcon } from '../ui/UiIcon';

function categoryLabel(cat: AnnotationCategory, lang: 'en' | 'el'): string {
  const row = SEMANTIC_CATEGORIES.find((c) => c.cat === cat);
  if (!row) return cat;
  return lang === 'el' ? row.labelEl : row.labelEn;
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

interface Props {
  onAskAgent?: (text: string) => void;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  concept?: string;
  sourceText?: string;
  sourceName?: string;
  fileKey?: string;
  emptyMessage?: string;
  hasSource?: boolean;
  onUpload?: () => void;
  focusTerm?: string;
  onOpenInReader?: (query: string) => void;
  onAnnotate?: (payload: AnnotationCreatedPayload) => void;
  lang?: 'en' | 'el';
  sharedAnnotations?: SharedAnnotationDto[];
  courseId?: string;
  pipelineVersion?: string;
  sectionLabel?: string;
  authToken?: string;
  onPublishShared?: (ann: StoredAnnotation) => void;
  annotationSyncLive?: boolean;
  annotationSyncVersion?: number;
  annotationSyncMode?: 'stream' | 'poll' | 'off';
  onRemapComplete?: (remappedCount: number) => void;
}

export function AnnotationOverlay({
  onAskAgent,
  onSelectionAction,
  concept = '',
  sourceText = '',
  sourceName = '',
  fileKey = 'no-source',
  emptyMessage,
  hasSource = false,
  onUpload,
  focusTerm,
  onOpenInReader,
  onAnnotate,
  lang: langProp,
  sharedAnnotations = [],
  courseId,
  pipelineVersion,
  sectionLabel,
  authToken,
  onPublishShared,
  annotationSyncLive = false,
  annotationSyncVersion = 0,
  annotationSyncMode = 'poll',
  onRemapComplete,
}: Props) {
  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;
  const [annotations, setAnnotations] = useState<StoredAnnotation[]>(() => loadAnnotations(fileKey));
  const [tool, setTool] = useState<'highlight' | 'comment' | 'pin'>('highlight');
  const [activeColor, setActiveColor] = useState<string>(ANNOTATION_COLORS[0]!);
  const [newComment, setNewComment] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [filterTerm, setFilterTerm] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<AnnotationCategory | null>(null);
  const [activeCategory, setActiveCategory] = useState<AnnotationCategory>('general');
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [remapPanelOpen, setRemapPanelOpen] = useState(false);
  const [remapReviewId, setRemapReviewId] = useState<string | null>(null);
  const [reviewLineHighlight, setReviewLineHighlight] = useState<number | null>(null);
  const [remapToast, setRemapToast] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIdleTimerRef = useRef<number | undefined>(undefined);
  const [scrollActive, setScrollActive] = useState(false);

  useEffect(() => {
    const loaded = loadAnnotations(fileKey).map((a) =>
      normalizeAnnotationAnchorStatus(a, pipelineVersion),
    );
    setAnnotations(loaded);
  }, [fileKey, pipelineVersion]);

  useEffect(() => {
    saveAnnotations(fileKey, annotations);
  }, [annotations, fileKey]);

  useEffect(() => {
    if (focusTerm) setTagDraft(focusTerm);
  }, [focusTerm]);

  const lines = useMemo(() => sourceText.split('\n'), [sourceText]);

  const taggedTerms = useMemo(() => {
    const terms = new Set<string>();
    annotations.forEach((a) => { if (a.focusTerm) terms.add(a.focusTerm); });
    if (focusTerm) terms.add(focusTerm);
    return [...terms];
  }, [annotations, focusTerm]);

  const allAnnotations = useMemo(() => {
    const teacherAsLocal: StoredAnnotation[] = sharedAnnotations.map((s) => ({
      id: `shared-${s.id}`,
      type: s.type,
      text: s.text,
      color: s.color,
      lineStart: s.lineStart,
      lineEnd: s.lineEnd,
      focusTerm: s.focusTerm,
      createdAt: s.createdAt,
    }));
    return [...annotations, ...teacherAsLocal];
  }, [annotations, sharedAnnotations]);

  const visibleAnnotations = useMemo(
    () => allAnnotations.filter((a) => {
      if (filterTerm && !termMatchesFocus(a.focusTerm ?? '', filterTerm)) return false;
      if (filterCategory && a.category !== filterCategory) return false;
      return true;
    }),
    [allAnnotations, filterTerm, filterCategory],
  );

  const needsReviewCount = useMemo(
    () => countAnnotationsNeedingReview(annotations),
    [annotations],
  );

  const remapPlan = useMemo(
    () => buildAnnotationRemapPlan(annotations, lines),
    [annotations, lines],
  );

  const remapEdgeReport = useMemo(
    () => auditAnnotationRemapEdgeCases(annotations, lines),
    [annotations, lines],
  );

  const remapEdgeBanner = useMemo(
    () => formatRemapEdgeCaseBanner(remapEdgeReport, lang),
    [remapEdgeReport, lang],
  );

  const scrollToLine = useCallback((lineIndex: number) => {
    setReviewLineHighlight(lineIndex);
    const container = contentRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-line-index="${lineIndex}"]`) as HTMLElement | null;
    if (!el) return;
    const targetTop = el.offsetTop - (container.clientHeight - el.offsetHeight) / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, []);

  const handleSourceScroll = useCallback(() => {
    setScrollActive(true);
    window.clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = window.setTimeout(() => setScrollActive(false), 140);
  }, []);

  useEffect(() => () => window.clearTimeout(scrollIdleTimerRef.current), []);

  const notifyRemap = useCallback((count: number) => {
    if (count > 0) onRemapComplete?.(count);
  }, [onRemapComplete]);

  const applyRemap = useCallback((id: string, lineIndex: number) => {
    setAnnotations((prev) => {
      const next = prev.map((a) => (
        a.id === id ? remapAnnotationToLine(a, lineIndex, lines, pipelineVersion) : a
      ));
      return next;
    });
    scrollToLine(lineIndex);
    notifyRemap(1);
    setRemapToast(lang === 'el' ? 'Anchor επανασυνδέθηκε' : 'Anchor remapped');
    setRemapReviewId(null);
  }, [lang, lines, notifyRemap, pipelineVersion, scrollToLine]);

  const handleAutoRemap = useCallback(() => {
    const result = autoRemapAnnotations(annotations, lines, pipelineVersion);
    setAnnotations(result.items);
    notifyRemap(result.remapped);
    if (result.remapped > 0) {
      setRemapToast(
        lang === 'el'
          ? `${result.remapped} αυτόματα · ${result.stillFlagged} ακόμα`
          : `${result.remapped} auto-fixed · ${result.stillFlagged} remaining`,
      );
    }
    if (result.stillFlagged === 0) {
      setRemapPanelOpen(false);
      setRemapReviewId(null);
    }
  }, [annotations, lang, lines, notifyRemap, pipelineVersion]);

  const openRemapReview = useCallback(() => {
    setRemapPanelOpen(true);
    const first = remapPlan[0]?.annotation.id ?? null;
    setRemapReviewId(first);
    if (first) {
      const ann = annotations.find((a) => a.id === first);
      if (ann) scrollToLine(ann.lineStart);
    }
  }, [annotations, remapPlan, scrollToLine]);

  useEffect(() => {
    if (!remapToast) return;
    const t = window.setTimeout(() => setRemapToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [remapToast]);

  const buildNewAnnotation = useCallback((
    lineIdx: number,
    text: string,
    type: StoredAnnotation['type'],
  ): StoredAnnotation => {
    const category = activeCategory === 'general' ? undefined : activeCategory;
    const anchor = buildAnnotationAnchor(fileKey, lines, lineIdx, {
      courseId,
      pipelineVersion,
      sectionLabel,
    });
    return {
      id: `ann-${Date.now()}`,
      type,
      text,
      color: activeColor,
      lineStart: lineIdx,
      lineEnd: lineIdx,
      focusTerm: tagDraft.trim() || focusTerm || undefined,
      createdAt: new Date().toISOString(),
      category,
      anchor,
      anchorStatus: 'ok',
    };
  }, [activeCategory, activeColor, courseId, fileKey, focusTerm, lines, pipelineVersion, sectionLabel, tagDraft]);

  const emitOnAnnotate = useCallback((ann: StoredAnnotation) => {
    onAnnotate?.({
      focusTerm: ann.focusTerm,
      category: ann.category,
      excerpt: ann.anchor?.excerpt ?? (lines[ann.lineStart] ?? '').trim(),
    });
  }, [lines, onAnnotate]);

  const addAnnotation = useCallback((lineIdx: number) => {
    if (remapPanelOpen && remapReviewId) {
      applyRemap(remapReviewId, lineIdx);
      return;
    }
    if (tool === 'comment') {
      setAddingAt(lineIdx);
      return;
    }
    const ann = buildNewAnnotation(lineIdx, tool === 'pin' ? t('pin') : '', tool);
    setAnnotations((prev) => [...prev, ann]);
    emitOnAnnotate(ann);
  }, [tool, t, buildNewAnnotation, emitOnAnnotate, remapPanelOpen, remapReviewId, applyRemap]);

  const confirmComment = () => {
    if (addingAt === null || !newComment.trim()) return;
    const ann = buildNewAnnotation(addingAt, newComment.trim(), 'comment');
    setAnnotations((prev) => [...prev, ann]);
    emitOnAnnotate(ann);
    setNewComment('');
    setAddingAt(null);
  };

  const removeAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const highlightedLines = useMemo(() => {
    const set = new Set<number>();
    visibleAnnotations.filter((a) => a.type === 'highlight').forEach((a) => {
      for (let i = a.lineStart; i <= a.lineEnd; i++) set.add(i);
    });
    return set;
  }, [visibleAnnotations]);

  const exportMd = () => {
    downloadBlob(`annotations-${fileKey}.md`, exportAnnotationsMarkdown(sourceName, lines, annotations), 'text/markdown');
  };

  const exportJson = () => {
    downloadBlob(`annotations-${fileKey}.json`, exportAnnotationsJson(fileKey, annotations, sourceName), 'application/json');
  };

  if (!sourceText.trim()) {
    return (
      <WorkspaceEmptyState
        tool="annotations"
        message={emptyMessage ?? 'Upload notes to annotate your own source material.'}
        hasSource={hasSource}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-card" data-testid="annotation-overlay">
      <AnnotationToolbar
        lang={lang}
        sourceName={sourceName}
        tool={tool}
        onToolChange={setTool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sharedCount={sharedAnnotations.length}
        syncLive={annotationSyncLive}
        syncMode={annotationSyncMode}
        syncVersion={annotationSyncVersion}
        canExport={annotations.length > 0}
        onExportMd={exportMd}
        sourceViewerLabel={t('sourceViewer')}
        highlightLabel={t('highlight')}
        commentLabel={t('comment')}
        pinLabel={t('pin')}
      />

      {needsReviewCount > 0 && (
        <WorkspacePanelWarnStrip
          testId="annotation-reprocess-banner"
          className="rounded-none border-x-0 border-t-0 px-3 py-1.5 text-[10px]"
          trailing={(
            <div className="flex shrink-0 flex-wrap gap-1">
              <button
                type="button"
                data-testid="annotation-banner-auto-remap"
                onClick={handleAutoRemap}
                className="ws-chip-ok inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-semibold"
              >
                <Wand2 className="h-3 w-3" />
                {lang === 'el' ? 'Αυτόματο' : 'Auto-remap'}
              </button>
              <button
                type="button"
                data-testid="annotation-banner-review"
                onClick={openRemapReview}
                className="ws-chip-warn rounded-md px-2 py-0.5 text-[9px] font-semibold"
              >
                {lang === 'el' ? 'Επανέλεγχος' : 'Review flagged'}
              </button>
            </div>
          )}
        >
          {lang === 'el'
            ? `${needsReviewCount} σημειώσεις χρειάζονται επανέλεγχο — το κείμενο άλλαξε μετά την επανεπεξεργασία.`
            : `${needsReviewCount} annotation(s) need review — source text changed after reprocess.`}
          {remapEdgeBanner && (
            <span className="ml-1 opacity-80" data-testid="annotation-remap-edge-summary">
              ({remapEdgeBanner})
            </span>
          )}
          {remapToast && (
            <span className="ml-2 font-semibold text-accent-emerald">{remapToast}</span>
          )}
        </WorkspacePanelWarnStrip>
      )}

      {remapPanelOpen && remapPlan.length > 0 && (
        <AnnotationRemapPanel
          entries={remapPlan}
          edgeReport={remapEdgeReport}
          lang={lang}
          activeId={remapReviewId}
          onSelect={(id) => {
            setRemapReviewId(id);
            const ann = annotations.find((a) => a.id === id);
            if (ann) scrollToLine(ann.lineStart);
          }}
          onRemap={applyRemap}
          onConfirmLegacy={(id) => {
            const ann = annotations.find((a) => a.id === id);
            if (!ann) return;
            setAnnotations((prev) => prev.map((a) => (
              a.id === id ? confirmLegacyAnnotationAtLine(a, lines, pipelineVersion) : a
            )));
            scrollToLine(ann.lineStart);
            notifyRemap(1);
          }}
          onDelete={(id) => {
            removeAnnotation(id);
            if (remapReviewId === id) setRemapReviewId(remapPlan.find((e) => e.annotation.id !== id)?.annotation.id ?? null);
          }}
          onAutoRemap={handleAutoRemap}
          onClose={() => {
            setRemapPanelOpen(false);
            setRemapReviewId(null);
            setReviewLineHighlight(null);
          }}
        />
      )}

      {(focusTerm || taggedTerms.length > 0 || annotations.some((a) => a.category && a.category !== 'general')) && (
        <div className="ws-filter-strip ws-ribbon shrink-0">
          <Tag className="h-3 w-3 shrink-0 text-text-muted" aria-hidden />
          <button
            type="button"
            onClick={() => setFilterTerm(null)}
            className={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-[8px] font-medium',
              !filterTerm ? 'ws-chip-brand' : 'text-text-muted',
            )}
          >
            {lang === 'el' ? 'Όλα' : 'All'}
          </button>
          {taggedTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setFilterTerm(filterTerm === term ? null : term)}
              className={cn(
                'shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-medium',
                filterTerm === term ? 'ws-chip-brand' : 'border-border-subtle text-text-muted',
              )}
            >
              {term}
            </button>
          ))}
          {SEMANTIC_CATEGORIES.map(({ cat, iconId, labelEn, labelEl }) => (
            <button
              key={`filter-${cat}`}
              type="button"
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 text-[8px] font-medium',
                filterCategory === cat ? 'ws-chip-brand' : 'border-border-subtle text-text-muted',
              )}
            >
              <UiIcon id={iconId} size="xs" />
              {lang === 'el' ? labelEl : labelEn}
            </button>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            placeholder={lang === 'el' ? 'Ετικέτα…' : 'Tag…'}
            className="ml-auto w-16 shrink-0 rounded border border-border-subtle bg-surface-input px-1 py-0.5 text-[8px] sm:w-20"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={contentRef}
          onScroll={handleSourceScroll}
          className={cn(
            'ws-annotation-source-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 font-mono text-[12px] leading-[20px] text-text-secondary sm:p-3 sm:text-[13px] sm:leading-[21px]',
            scrollActive && 'ws-annotation-source-scroll--active',
          )}
          data-testid="annotation-source-scroll"
        >
          {lines.map((line, i) => {
            const isHighlighted = highlightedLines.has(i);
            const isEmpty = line.trim() === '';
            const isHeading = /^(Chapter|\d+\.)/.test(line.trim());
            const pinHere = visibleAnnotations.some((a) => a.type === 'pin' && a.lineStart === i);
            const termHit = focusTerm && termMatchesFocus(line, focusTerm);
            const lineAnns = visibleAnnotations.filter((a) => a.lineStart === i);
            const isFlaggedLine = annotations.some(
              (a) => (a.anchorStatus === 'needs-review' || a.anchorStatus === 'legacy') && a.lineStart === i,
            );
            const isReviewTarget = reviewLineHighlight === i;
            return (
              <div
                key={i}
                data-line-index={i}
                onClick={() => addAnnotation(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && addAnnotation(i)}
                className={cn(
                  'ws-annotation-line px-2 rounded cursor-pointer hover:bg-surface-hover/50 relative group',
                  isHighlighted && 'bg-brand-500/10 border-l-2 border-brand-500',
                  termHit && !isHighlighted && 'bg-accent-cyan/8 border-l-2 border-accent-cyan/40',
                  isReviewTarget && 'ring-1 ring-accent-amber/60 bg-accent-amber/10',
                  isFlaggedLine && !isReviewTarget && 'border-l-2 border-dashed border-accent-amber/50',
                  remapPanelOpen && remapReviewId && 'hover:ring-1 hover:ring-accent-emerald/40',
                  isHeading && 'font-bold text-text-primary text-sm mt-2',
                  isEmpty && 'h-3',
                )}
              >
                {pinHere && <Pin className="absolute -left-1 w-2.5 h-2.5 text-brand-500" aria-hidden />}
                {line || '\u00A0'}
                {onOpenInReader && line.trim().length > 8 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenInReader(line.trim()); }}
                    className="absolute right-1 top-0.5 hidden p-0.5 rounded text-brand-800 hover:bg-surface-hover [@media(hover:hover)]:group-hover:block"
                    title={lang === 'el' ? 'Άνοιγμα στον αναγνώστη' : 'Open in reader'}
                  >
                    <BookOpen className="w-3 h-3" />
                  </button>
                )}
                {lineAnns.some((a) => a.focusTerm) && (
                  <span className="ml-1 text-[8px] text-brand-700 opacity-80">
                    #{lineAnns.find((a) => a.focusTerm)?.focusTerm}
                  </span>
                )}
                {lineAnns.some((a) => a.category === 'confusing') && (
                  <span className="ml-1 inline-flex" title={categoryLabel('confusing', lang)}>
                    <AlertTriangle className="w-2.5 h-2.5 text-accent-amber" aria-hidden />
                  </span>
                )}
                {lineAnns.some((a) => a.category === 'exam-relevant') && (
                  <span className="ml-1 inline-flex" title={categoryLabel('exam-relevant', lang)}>
                    <FileText className="w-2.5 h-2.5 text-brand-800" aria-hidden />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <AnnotationMarginRail
          lang={lang}
          expanded={expanded}
          onToggleExpanded={() => setExpanded(!expanded)}
          visibleAnnotations={visibleAnnotations}
          lines={lines}
          selectedAnnId={selectedAnnId}
          onSelectAnn={(id) => {
            setSelectedAnnId(id);
            const ann = visibleAnnotations.find((a) => a.id === id);
            if (ann) scrollToLine(ann.lineStart);
          }}
          onRemoveAnn={removeAnnotation}
          countLabel={t('annotations')}
          onExportJson={annotations.length > 0 ? exportJson : undefined}
          onOpenInReader={onOpenInReader}
          onAskAgent={onAskAgent}
          onPublishShared={onPublishShared}
          authToken={authToken}
          courseId={courseId}
          focusTerm={focusTerm}
          concept={concept}
          sectionLabel={sectionLabel}
          onSelectionAction={onSelectionAction}
          askAgentLabel={t('askAgent')}
        />
      </div>

      <AnimatePresence>
        {addingAt !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-3 glass-strong border-t border-border-subtle z-10"
          >
            <p className="text-xs font-semibold mb-2 inline-flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
              {t('addComment')} (line {addingAt + 1})
              {tagDraft && <span className="text-brand-800 font-normal ml-1">· #{tagDraft}</span>}
            </p>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                autoFocus
                placeholder={lang === 'el' ? 'Σημείωση περιθωρίου…' : 'Margin note…'}
                onKeyDown={(e) => e.key === 'Enter' && confirmComment()}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50"
              />
              <button type="button" onClick={confirmComment} className="px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg">OK</button>
              <button type="button" onClick={() => setAddingAt(null)} className="px-3 py-2 text-text-muted hover:text-text-secondary text-xs rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
