import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Pin, Highlighter, X, ChevronDown, ChevronUp,
  Sparkles, Trash2, FileText, Download, BookOpen, Tag,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import {
  exportAnnotationsJson,
  exportAnnotationsMarkdown,
  loadAnnotations,
  saveAnnotations,
  type StoredAnnotation,
} from '../../lib/annotationStore';
import type { SharedAnnotationDto } from '../../lib/authClient';
import { termMatchesFocus } from '../../lib/workspaceFocus';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

const COLORS = ['#818cf8', '#fbbf24', '#34d399', '#fb7185', '#22d3ee'];

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
  sourceText?: string;
  sourceName?: string;
  fileKey?: string;
  emptyMessage?: string;
  onUpload?: () => void;
  focusTerm?: string;
  onOpenInReader?: (query: string) => void;
  onAnnotate?: (focusTerm?: string) => void;
  lang?: 'en' | 'el';
  sharedAnnotations?: SharedAnnotationDto[];
  courseId?: string;
  authToken?: string;
  onPublishShared?: (ann: StoredAnnotation) => void;
  annotationSyncLive?: boolean;
  annotationSyncVersion?: number;
  annotationSyncMode?: 'stream' | 'poll' | 'off';
}

export function AnnotationOverlay({
  onAskAgent,
  sourceText = '',
  sourceName = '',
  fileKey = 'no-source',
  emptyMessage,
  onUpload,
  focusTerm,
  onOpenInReader,
  onAnnotate,
  lang: langProp,
  sharedAnnotations = [],
  courseId,
  authToken,
  onPublishShared,
  annotationSyncLive = false,
  annotationSyncVersion = 0,
  annotationSyncMode = 'poll',
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnnotations(loadAnnotations(fileKey));
  }, [fileKey]);

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
    () => (filterTerm ? allAnnotations.filter((a) => termMatchesFocus(a.focusTerm ?? '', filterTerm)) : allAnnotations),
    [allAnnotations, filterTerm],
  );

  const addAnnotation = useCallback((lineIdx: number) => {
    if (tool === 'comment') {
      setAddingAt(lineIdx);
      return;
    }
    const ann: StoredAnnotation = {
      id: `ann-${Date.now()}`,
      type: tool,
      text: tool === 'pin' ? t('pin') : '',
      color: activeColor,
      lineStart: lineIdx,
      lineEnd: lineIdx,
      focusTerm: tagDraft.trim() || focusTerm || undefined,
      createdAt: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, ann]);
    onAnnotate?.(ann.focusTerm);
  }, [tool, activeColor, t, tagDraft, focusTerm, onAnnotate]);

  const confirmComment = () => {
    if (addingAt === null || !newComment.trim()) return;
    const ann: StoredAnnotation = {
      id: `ann-${Date.now()}`,
      type: 'comment',
      text: newComment.trim(),
      color: activeColor,
      lineStart: addingAt,
      lineEnd: addingAt,
      focusTerm: tagDraft.trim() || focusTerm || undefined,
      createdAt: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, ann]);
    onAnnotate?.(ann.focusTerm);
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
        </div>
      </div>

      {(focusTerm || taggedTerms.length > 0) && (
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
            return (
              <div
                key={i}
                onClick={() => addAnnotation(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && addAnnotation(i)}
                className={cn(
                  'px-2 rounded cursor-pointer transition-colors hover:bg-surface-hover/50 relative group',
                  isHighlighted && 'bg-brand-500/10 border-l-2 border-brand-500',
                  termHit && !isHighlighted && 'bg-accent-cyan/8 border-l-2 border-accent-cyan/40',
                  isHeading && 'font-bold text-text-primary text-sm mt-2',
                  isEmpty && 'h-3',
                )}
              >
                {pinHere && <span className="absolute -left-1 text-[10px]">📌</span>}
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
                    className="p-2 rounded-lg border text-[10px]"
                    style={{ borderColor: `${ann.color}40`, backgroundColor: `${ann.color}08` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize" style={{ color: ann.color }}>
                        {ann.type === 'highlight' ? '🖍' : ann.type === 'comment' ? '💬' : '📌'} {ann.type}
                      </span>
                      <button type="button" onClick={() => removeAnnotation(ann.id)} className="text-text-muted hover:text-accent-rose">
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
                    {ann.text && ann.type === 'comment' && <p className="text-text-secondary mt-1">{ann.text}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {onOpenInReader && (
                        <button
                          type="button"
                          data-testid="annotation-open-reader"
                          onClick={() => onOpenInReader(lines[ann.lineStart]?.trim() || ann.focusTerm || '')}
                          className="flex items-center gap-1 text-accent-cyan hover:text-accent-cyan/80"
                        >
                          <BookOpen className="w-3 h-3" />
                          {lang === 'el' ? 'Αναγνώστης' : 'Reader'}
                        </button>
                      )}
                      {!ann.id.startsWith('shared-') && authToken && courseId && onPublishShared && (
                        <button
                          type="button"
                          onClick={() => onPublishShared(ann)}
                          className="text-[9px] text-accent-amber hover:text-accent-amber/80"
                        >
                          {lang === 'el' ? 'Κοινοποίηση' : 'Share'}
                        </button>
                      )}
                      {(ann.type === 'highlight' || ann.type === 'pin') && onAskAgent && (
                        <button
                          type="button"
                          onClick={() => onAskAgent(lines[ann.lineStart] || '')}
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
            <p className="text-xs font-semibold mb-2">
              💬 {t('addComment')} (line {addingAt + 1})
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
