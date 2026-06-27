import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Pin, Highlighter, X, ChevronDown, ChevronUp,
  Sparkles, Trash2, FileText, Download, BookOpen, Tag, AlertTriangle, Wand2,
} from '@/lib/lucide-shim';
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
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { AnnotationRemapPanel } from './AnnotationRemapPanel';
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
import type { UiIconId } from '../../lib/uiIconRegistry';
import { UiIcon } from '../ui/UiIcon';

const COLORS = ['#818cf8', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];

const SEMANTIC_CATEGORIES: { cat: AnnotationCategory; iconId: UiIconId; labelEn: string; labelEl: string }[] = [
  { cat: 'confusing', iconId: 'warning', labelEn: 'Confusing', labelEl: 'Μπερδεμένο' },
  { cat: 'exam-relevant', iconId: 'notes', labelEn: 'Exam', labelEl: 'Εξέταση' },
];

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
  const [activeColor, setActiveColor] = useState(COLORS[0]!);
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

  const lines = sourceText.split('\n');

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
    const el = contentRef.current?.children[lineIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

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

  const highlightedLines = new Set<number>();
  visibleAnnotations.filter((a) => a.type === 'highlight').forEach((a) => {
    for (let i = a.lineStart; i <= a.lineEnd; i++) highlightedLines.add(i);
  });

  const exportMd = () => {
    downloadBlob(`annotations-${fileKey}.md`, exportAnnotationsMarkdown(sourceName, lines, annotations), 'text/markdown');
  };

  const exportJson = () => {
    downloadBlob(`annotations-${fileKey}.json`, exportAnnotationsJson(fileKey, annotations, sourceName), 'application/json');
  };

  if (!sourceText.trim()) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to annotate your own source material.'}
        hasSource={hasSource}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="relative flex flex-col h-full rounded-2xl border border-border-subtle bg-surface-card overflow-hidden" data-testid="annotation-overlay">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-subtle bg-surface-secondary/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span className="text-xs font-semibold text-text-secondary">{t('sourceViewer')}</span>
          {sharedAnnotations.length > 0 && (
            <span className="text-[9px] text-accent-amber border border-accent-amber/30 rounded px-1.5 py-0.5">
              {sharedAnnotations.length} {lang === 'el' ? 'διδασκ.' : 'teacher'}
            </span>
          )}
          {annotationSyncLive && (
            <span
              data-testid="annotation-sync-live"
              className="text-[9px] text-accent-emerald border border-accent-emerald/30 rounded px-1.5 py-0.5"
              title={lang === 'el' ? `Συγχρονισμός v${annotationSyncVersion}` : `Sync v${annotationSyncVersion}`}
            >
              {annotationSyncMode === 'stream'
                ? (lang === 'el' ? 'Stream' : 'Stream')
                : (lang === 'el' ? 'Ζωντανά' : 'Live')}
            </span>
          )}
          <span className="text-[10px] text-text-muted truncate">{sourceName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {[
            { tool: 'highlight' as const, icon: Highlighter, label: t('highlight') },
            { tool: 'comment' as const, icon: MessageSquare, label: t('comment') },
            { tool: 'pin' as const, icon: Pin, label: t('pin') },
          ].map((b) => (
            <button
              key={b.tool}
              type="button"
              onClick={() => setTool(b.tool)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                tool === b.tool ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <b.icon className="w-3 h-3" />
              {b.label}
            </button>
          ))}
          {annotations.length > 0 && (
            <button type="button" onClick={exportMd} className="p-1 text-text-muted hover:text-brand-300" title="Export">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="ml-1 flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveColor(c)}
                className={cn('w-4 h-4 rounded-full border-2 transition-all', activeColor === c ? 'border-white scale-125' : 'border-transparent opacity-60')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-border-subtle mx-0.5" />
          <button
            type="button"
            onClick={() => setActiveCategory('general')}
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-medium',
              activeCategory === 'general' ? 'bg-surface-hover text-text-secondary' : 'text-text-muted',
            )}
          >
            {lang === 'el' ? 'Γενικό' : 'General'}
          </button>
          {SEMANTIC_CATEGORIES.map(({ cat, iconId, labelEn, labelEl }) => (
            <button
              key={cat}
              type="button"
              data-testid={`annotation-category-${cat}`}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all inline-flex items-center gap-0.5',
                activeCategory === cat
                  ? cat === 'confusing'
                    ? 'border-accent-amber/50 text-accent-amber bg-accent-amber/10'
                    : 'border-accent-cyan/50 text-accent-cyan bg-accent-cyan/10'
                  : 'border-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              <UiIcon id={iconId} size="xs" />
              {lang === 'el' ? labelEl : labelEn}
            </button>
          ))}
        </div>
      </div>

      {needsReviewCount > 0 && (
        <div
          data-testid="annotation-reprocess-banner"
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 border-b border-accent-amber/30 bg-accent-amber/8 text-[10px] text-accent-amber shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>
              {lang === 'el'
                ? `${needsReviewCount} σημειώσεις χρειάζονται επανέλεγχο — το κείμενο άλλαξε μετά την επανεπεξεργασία.`
                : `${needsReviewCount} annotation(s) need review — source text changed after reprocess.`}
              {remapEdgeBanner && (
                <span className="ml-1 text-accent-amber/80" data-testid="annotation-remap-edge-summary">
                  ({remapEdgeBanner})
                </span>
              )}
            </span>
            {remapToast && (
              <span className="text-accent-emerald font-medium">{remapToast}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="annotation-banner-auto-remap"
              onClick={handleAutoRemap}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 font-medium text-accent-emerald hover:bg-accent-emerald/15"
            >
              <Wand2 className="w-3 h-3" />
              {lang === 'el' ? 'Αυτόματο' : 'Auto-remap'}
            </button>
            <button
              type="button"
              data-testid="annotation-banner-review"
              onClick={openRemapReview}
              className="rounded-lg border border-accent-amber/40 bg-accent-amber/15 px-2 py-0.5 font-medium hover:bg-accent-amber/25"
            >
              {lang === 'el' ? 'Επανέλεγχος' : 'Review flagged'}
            </button>
          </div>
        </div>
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
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-b border-border-subtle bg-surface-primary/30 shrink-0">
          <Tag className="w-3 h-3 text-text-muted" />
          <button
            type="button"
            onClick={() => setFilterTerm(null)}
            className={cn('text-[9px] px-1.5 py-0.5 rounded', !filterTerm ? 'bg-brand-500/20 text-brand-300' : 'text-text-muted')}
          >
            {lang === 'el' ? 'Όλα' : 'All'}
          </button>
          {taggedTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setFilterTerm(filterTerm === term ? null : term)}
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded border',
                filterTerm === term ? 'border-brand-400 text-brand-300 bg-brand-500/10' : 'border-border-subtle text-text-muted',
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
                'text-[9px] px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5',
                filterCategory === cat ? 'border-brand-400 text-brand-300 bg-brand-500/10' : 'border-border-subtle text-text-muted',
              )}
            >
              <UiIcon id={iconId} size="xs" />
              {lang === 'el' ? labelEl : labelEn}
            </button>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            placeholder={lang === 'el' ? 'Ετικέτα όρου…' : 'Term tag…'}
            className="ml-auto w-24 px-1.5 py-0.5 text-[9px] rounded bg-surface-input border border-border-subtle"
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-[22px] text-text-secondary relative">
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
                  'px-2 rounded cursor-pointer transition-colors hover:bg-surface-hover/50 relative group',
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
                    className="absolute right-1 top-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded text-accent-cyan hover:bg-surface-hover"
                    title={lang === 'el' ? 'Άνοιγμα στον αναγνώστη' : 'Open in reader'}
                  >
                    <BookOpen className="w-3 h-3" />
                  </button>
                )}
                {lineAnns.some((a) => a.focusTerm) && (
                  <span className="ml-1 text-[8px] text-brand-400 opacity-80">
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
                    <FileText className="w-2.5 h-2.5 text-accent-cyan" aria-hidden />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={cn('border-l border-border-subtle bg-surface-secondary/30 transition-all overflow-y-auto shrink-0', expanded ? 'w-56' : 'w-8')}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full p-2 flex items-center justify-center text-text-muted hover:text-text-secondary"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 rotate-90" /> : <ChevronUp className="w-3.5 h-3.5 rotate-90" />}
          </button>
          {expanded && (
            <div className="px-2 pb-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-text-muted font-medium">{visibleAnnotations.length} {t('annotations')}</p>
                {annotations.length > 0 && (
                  <button type="button" onClick={exportJson} className="text-[9px] text-brand-400">JSON</button>
                )}
              </div>
              <AnimatePresence>
                {visibleAnnotations.map((ann) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAnnId((prev) => (prev === ann.id ? null : ann.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAnnId((prev) => (prev === ann.id ? null : ann.id));
                      }
                    }}
                    className={cn(
                      'p-2 rounded-lg border text-[10px] cursor-pointer transition-colors',
                      selectedAnnId === ann.id && 'ring-1 ring-accent-cyan/50 bg-accent-cyan/5',
                    )}
                    style={{ borderColor: `${ann.color}40`, backgroundColor: `${ann.color}08` }}
                    data-testid={`annotation-card-${ann.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize inline-flex items-center gap-1" style={{ color: ann.color }}>
                        {ann.type === 'highlight' ? <Highlighter className="w-3 h-3" /> : ann.type === 'comment' ? <MessageSquare className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        {ann.type}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnnotation(ann.id);
                          if (selectedAnnId === ann.id) setSelectedAnnId(null);
                        }}
                        className="text-text-muted hover:text-accent-rose"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-text-muted line-clamp-2 italic">{(lines[ann.lineStart] ?? '').trim().slice(0, 80)}</p>
                    {ann.id.startsWith('shared-') && (
                      <span className="text-[8px] text-accent-amber ml-1">{lang === 'el' ? 'διδάσκαλος' : 'teacher'}</span>
                    )}
                    {ann.focusTerm && (
                      <span className="inline-block mt-1 text-[9px] px-1 py-0.5 rounded bg-brand-500/15 text-brand-300">#{ann.focusTerm}</span>
                    )}
                    {ann.category && ann.category !== 'general' && (
                      <span className={cn(
                        'inline-block mt-1 ml-1 text-[9px] px-1 py-0.5 rounded',
                        ann.category === 'confusing' ? 'bg-accent-amber/15 text-accent-amber' : 'bg-accent-cyan/15 text-accent-cyan',
                      )}
                      >
                        {categoryLabel(ann.category, lang)}
                      </span>
                    )}
                    {ann.anchorStatus && ann.anchorStatus !== 'ok' && (
                      <span className="inline-block mt-1 ml-1 text-[8px] px-1 py-0.5 rounded bg-accent-amber/20 text-accent-amber">
                        {ann.anchorStatus === 'legacy'
                          ? (lang === 'el' ? 'παλιό anchor' : 'legacy anchor')
                          : (lang === 'el' ? 'επανέλεγχο' : 'needs review')}
                      </span>
                    )}
                    {ann.text && ann.type === 'comment' && <p className="text-text-secondary mt-1">{ann.text}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {onOpenInReader && (
                        <button
                          type="button"
                          data-testid="annotation-open-reader"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInReader(lines[ann.lineStart]?.trim() || ann.focusTerm || '');
                          }}
                          className="flex items-center gap-1 text-accent-cyan hover:text-accent-cyan/80"
                        >
                          <BookOpen className="w-3 h-3" />
                          {lang === 'el' ? 'Αναγνώστης' : 'Reader'}
                        </button>
                      )}
                      {!ann.id.startsWith('shared-') && authToken && courseId && onPublishShared && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPublishShared(ann);
                          }}
                          className="text-[9px] text-accent-amber hover:text-accent-amber/80"
                        >
                          {lang === 'el' ? 'Κοινοποίηση' : 'Share'}
                        </button>
                      )}
                      {(ann.type === 'highlight' || ann.type === 'pin') && onAskAgent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAskAgent(lines[ann.lineStart] || '');
                          }}
                          className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                        >
                          <Sparkles className="w-3 h-3" />
                          {t('askAgent')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {selectedAnnId && onSelectionAction && (() => {
                const ann = visibleAnnotations.find((a) => a.id === selectedAnnId);
                if (!ann) return null;
                const excerpt = [
                  lines[ann.lineStart]?.trim(),
                  ann.text?.trim(),
                ].filter(Boolean).join('\n').slice(0, 600);
                return (
                  <div className="sticky bottom-0 pt-1 border-t border-white/10 bg-surface-secondary/95" data-testid="annotation-selection-actions">
                    <WorkspaceSelectionActionBar
                      lang={lang}
                      excerpt={excerpt}
                      originTool="annotations"
                      onDismiss={() => setSelectedAnnId(null)}
                      onAction={(action) => {
                        onSelectionAction(action, {
                          text: excerpt,
                          term: ann.focusTerm || focusTerm || concept,
                          sectionLabel,
                          originTool: 'annotations',
                        });
                        setSelectedAnnId(null);
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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
              {tagDraft && <span className="text-brand-300 font-normal ml-1">· #{tagDraft}</span>}
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
