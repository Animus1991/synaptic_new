import { motion, AnimatePresence } from 'framer-motion';
import {
  Highlighter, MessageSquare, Pin, Trash2, BookOpen, Sparkles,
  ChevronDown, ChevronUp, AlertTriangle, FileText,
} from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { StoredAnnotation, AnnotationCategory } from '../../lib/annotationStore';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { SEMANTIC_CATEGORIES } from './AnnotationToolbar';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

function categoryLabel(cat: AnnotationCategory, lang: 'en' | 'el'): string {
  const row = SEMANTIC_CATEGORIES.find((c) => c.cat === cat);
  if (!row) return cat;
  return lang === 'el' ? row.labelEl : row.labelEn;
}

type Props = {
  lang: 'en' | 'el';
  expanded: boolean;
  onToggleExpanded: () => void;
  visibleAnnotations: StoredAnnotation[];
  lines: string[];
  selectedAnnId: string | null;
  onSelectAnn: (id: string | null) => void;
  onRemoveAnn: (id: string) => void;
  countLabel: string;
  onExportJson?: () => void;
  onOpenInReader?: (query: string) => void;
  onAskAgent?: (text: string) => void;
  onPublishShared?: (ann: StoredAnnotation) => void;
  authToken?: string;
  courseId?: string;
  focusTerm?: string;
  concept?: string;
  sectionLabel?: string;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  askAgentLabel: string;
};

export function AnnotationMarginRail({
  lang,
  expanded,
  onToggleExpanded,
  visibleAnnotations,
  lines,
  selectedAnnId,
  onSelectAnn,
  onRemoveAnn,
  countLabel,
  onExportJson,
  onOpenInReader,
  onAskAgent,
  onPublishShared,
  authToken,
  courseId,
  focusTerm,
  concept,
  sectionLabel,
  onSelectionAction,
  askAgentLabel,
}: Props) {
  const { t } = useI18n();

  return (
    <aside
      className="ws-margin-rail h-full min-h-0 self-stretch"
      data-expanded={expanded}
      data-testid="annotation-margin-rail"
      aria-label={t('annoPanelAria')}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full shrink-0 items-center justify-center py-1.5 text-text-muted hover:text-text-secondary"
        aria-expanded={expanded}
        aria-label={expanded ? t('collapse') : t('expand')}
      >
        {expanded ? <ChevronDown className="h-3 w-3 rotate-90" /> : <ChevronUp className="h-3 w-3 rotate-90" />}
      </button>

      {expanded && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1.5 pb-1.5">
          <div className="mb-1 flex items-center justify-between px-0.5">
            <p className="ws-eyebrow text-text-muted"><span className="ws-num">{visibleAnnotations.length}</span> <AllCapsLabel>{countLabel}</AllCapsLabel></p>
            {onExportJson && visibleAnnotations.length > 0 && (
              <button
                type="button"
                onClick={onExportJson}
                className="text-[10px] font-medium text-brand-700 hover:underline"
              >
                JSON
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {visibleAnnotations.map((ann) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectAnn(selectedAnnId === ann.id ? null : ann.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectAnn(selectedAnnId === ann.id ? null : ann.id);
                    }
                  }}
                  className={cn(
                    'ws-annotation-card border cursor-pointer transition-colors',
                    selectedAnnId === ann.id && 'ring-1 ring-brand-600/35 bg-brand-100/40',
                  )}
                  style={{ borderColor: `${ann.color}35`, backgroundColor: `${ann.color}06` }}
                  data-testid={`annotation-card-${ann.id}`}
                >
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <span
                      className="inline-flex items-center gap-0.5 font-semibold capitalize"
                      style={{ color: ann.color }}
                    >
                      {ann.type === 'highlight' ? (
                        <Highlighter className="h-2.5 w-2.5" />
                      ) : ann.type === 'comment' ? (
                        <MessageSquare className="h-2.5 w-2.5" />
                      ) : (
                        <Pin className="h-2.5 w-2.5" />
                      )}
                      {ann.type}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAnn(ann.id);
                        if (selectedAnnId === ann.id) onSelectAnn(null);
                      }}
                      className="text-text-muted hover:text-accent-rose"
                      aria-label={t('deleteLabel')}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  <p className="line-clamp-2 ws-excerpt text-text-muted">
                    {(lines[ann.lineStart] ?? '').trim().slice(0, 72)}
                  </p>

                  {ann.id.startsWith('shared-') && (
                    <span className="text-[7px] text-accent-amber">{t('annoTeacherFull')}</span>
                  )}

                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {ann.focusTerm && (
                      <span className="rounded bg-brand-600/12 px-1 py-px text-[10px] text-brand-800">
                        #{ann.focusTerm}
                      </span>
                    )}
                    {ann.category && ann.category !== 'general' && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px]',
                          ann.category === 'confusing'
                            ? 'bg-accent-amber/12 text-accent-amber'
                            : 'bg-brand-600/10 text-brand-800',
                        )}
                      >
                        {ann.category === 'confusing' ? (
                          <AlertTriangle className="h-2 w-2" aria-hidden />
                        ) : (
                          <FileText className="h-2 w-2" aria-hidden />
                        )}
                        {categoryLabel(ann.category, lang)}
                      </span>
                    )}
                    {ann.anchorStatus && ann.anchorStatus !== 'ok' && (
                      <span className="rounded bg-accent-amber/15 px-1 py-px text-[7px] text-accent-amber">
                        {ann.anchorStatus === 'legacy'
                          ? t('annoLegacy')
                          : t('annoReview')}
                      </span>
                    )}
                  </div>

                  {ann.text && ann.type === 'comment' && (
                    <p className="mt-0.5 text-text-secondary">{ann.text}</p>
                  )}

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {onOpenInReader && (
                      <button
                        type="button"
                        data-testid="annotation-open-reader"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInReader(lines[ann.lineStart]?.trim() || ann.focusTerm || '');
                        }}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-800 hover:underline"
                      >
                        <BookOpen className="h-2.5 w-2.5" />
                        {t('annoReaderShort')}
                      </button>
                    )}
                    {!ann.id.startsWith('shared-') && authToken && courseId && onPublishShared && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPublishShared(ann);
                        }}
                        className="text-[10px] font-medium text-accent-amber hover:underline"
                      >
                        {t('shareShort')}
                      </button>
                    )}
                    {(ann.type === 'highlight' || ann.type === 'pin') && onAskAgent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAgent(lines[ann.lineStart] || '');
                        }}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-700 hover:underline"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {askAgentLabel}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {selectedAnnId && onSelectionAction && (() => {
            const ann = visibleAnnotations.find((a) => a.id === selectedAnnId);
            if (!ann) return null;
            const excerpt = [
              lines[ann.lineStart]?.trim(),
              ann.text?.trim(),
            ].filter(Boolean).join('\n').slice(0, 600);
            return (
              <div
                className="sticky bottom-0 mt-1 border-t border-border-subtle/80 bg-surface-secondary/95 pt-1"
                data-testid="annotation-selection-actions"
              >
                <WorkspaceSelectionActionBar
                  lang={lang}
                  excerpt={excerpt}
                  originTool="annotations"
                  onDismiss={() => onSelectAnn(null)}
                  onAction={(action) => {
                    onSelectionAction(action, {
                      text: excerpt,
                      term: ann.focusTerm || focusTerm || concept || '',
                      sectionLabel,
                      originTool: 'annotations',
                    });
                    onSelectAnn(null);
                  }}
                />
              </div>
            );
          })()}
        </div>
      )}
    </aside>
  );
}
