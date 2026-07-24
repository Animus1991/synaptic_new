import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
} from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ReprocessEditorSection } from '../../lib/reprocessEditorSections';
import {
  cloneReprocessSections,
  countManualEdits,
  normalizeSectionText,
  sectionHasManualEdits,
} from '../../lib/reprocessEditorSections';
import { useI18n } from '../../lib/i18n';

type Props = {
  sections: ReprocessEditorSection[];
  lang: 'en' | 'el';
  onChange: (sections: ReprocessEditorSection[]) => void;
  initialSectionIndex?: number;
};

const PANE_HEIGHTS = {
  compact: 160,
  expanded: 320,
  tall: 480,
} as const;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ReprocessTextEditor({ sections, onChange, initialSectionIndex = 0 }: Props) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialSectionIndex, 0), Math.max(sections.length - 1, 0)),
  );
  const [paneHeight, setPaneHeight] = useState<keyof typeof PANE_HEIGHTS>('compact');
  const [syncScroll, setSyncScroll] = useState(true);
  const beforeRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLTextAreaElement>(null);
  const syncingRef = useRef(false);
  const sectionListRef = useRef<HTMLDivElement>(null);

  const active = sections[activeIndex];
  const manualEdits = countManualEdits(sections);
  const heightPx = PANE_HEIGHTS[paneHeight];
  const sectionLabel = (index: number) => `${t('reprocessSectionSingular')} ${index + 1}`;

  const updateSection = useCallback(
    (index: number, patch: Partial<ReprocessEditorSection>) => {
      onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    },
    [onChange, sections],
  );

  const goToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      setActiveIndex(index);
      requestAnimationFrame(() => {
        const el = sectionListRef.current?.querySelector(`[data-section-index="${index}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    },
    [sections.length],
  );

  const handleSyncScroll = useCallback(
    (source: 'before' | 'after') => {
      if (!syncScroll || syncingRef.current) return;
      const beforeEl = beforeRef.current;
      const afterEl = afterRef.current;
      if (!beforeEl || !afterEl) return;

      syncingRef.current = true;
      const beforeMax = beforeEl.scrollHeight - beforeEl.clientHeight;
      const afterMax = afterEl.scrollHeight - afterEl.clientHeight;
      const ratio = source === 'before'
        ? (beforeMax > 0 ? beforeEl.scrollTop / beforeMax : 0)
        : (afterMax > 0 ? afterEl.scrollTop / afterMax : 0);

      if (source === 'before' && afterMax > 0) {
        afterEl.scrollTop = ratio * afterMax;
      } else if (source === 'after' && beforeMax > 0) {
        beforeEl.scrollTop = ratio * beforeMax;
      }
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [syncScroll],
  );

  useEffect(() => {
    const idx = Math.min(Math.max(initialSectionIndex, 0), Math.max(sections.length - 1, 0));
    setActiveIndex(idx);
  }, [initialSectionIndex, sections.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        if (e.altKey && e.key === 'ArrowUp') {
          e.preventDefault();
          goToSection(activeIndex - 1);
        }
        if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          goToSection(activeIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, goToSection]);

  const cyclePaneHeight = () => {
    setPaneHeight((h) => (h === 'compact' ? 'expanded' : h === 'expanded' ? 'tall' : 'compact'));
  };

  if (!active) return null;

  return (
    <div className="space-y-3" data-testid="reprocess-text-editor">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-primary/50 px-3 py-2">
        <span className="text-[10px] font-medium text-text-muted">
          {t('reprocessSectionSingular')} {activeIndex + 1}/{sections.length}
        </span>
        {manualEdits > 0 && (
          <span className="rounded-full bg-brand-600/15 px-2 py-0.5 text-[9px] font-medium text-brand-700">
            {manualEdits} {t('reprocessManualEdits')}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSyncScroll((v) => !v)}
            className={cn(
              'rounded-md border px-2 py-1 text-[9px] transition-colors',
              syncScroll
                ? 'border-brand-600/40 bg-brand-600/10 text-brand-800'
                : 'border-border-subtle text-text-muted hover:bg-surface-hover',
            )}
            title={t('reprocessSyncScrollTitle')}
          >
            <ArrowDownUp className="mr-1 inline h-3 w-3" />
            {t('reprocessSyncScroll')}
          </button>
          <button
            type="button"
            onClick={cyclePaneHeight}
            className="rounded-md border border-border-subtle px-2 py-1 text-[9px] text-text-muted hover:bg-surface-hover"
            title={t('reprocessPaneResizeTitle')}
            data-testid="reprocess-pane-resize"
          >
            {paneHeight === 'tall' ? (
              <Minimize2 className="inline h-3 w-3" />
            ) : (
              <Maximize2 className="inline h-3 w-3" />
            )}
            <span className="ml-1 hidden sm:inline">
              {paneHeight === 'compact'
                ? t('reprocessExpand')
                : paneHeight === 'expanded'
                  ? t('reprocessTaller')
                  : t('reprocessShrink')}
            </span>
          </button>
        </div>
      </div>

      <div className="flex gap-3 min-h-0">
        <nav
          ref={sectionListRef}
          className="hidden w-36 shrink-0 flex-col gap-1 overflow-y-auto rounded-xl border border-border-subtle bg-surface-primary/40 p-2 sm:flex max-h-[420px]"
          aria-label={t('reprocessTextSectionsAria')}
        >
          {sections.map((section, i) => (
            <button
              key={section.id}
              type="button"
              data-section-index={i}
              onClick={() => goToSection(i)}
              className={cn(
                'rounded-lg px-2 py-1.5 text-left text-[9px] leading-snug transition-colors',
                i === activeIndex
                  ? 'bg-brand-600/15 text-brand-800 font-medium'
                  : 'text-text-secondary hover:bg-surface-hover',
                sectionHasManualEdits(section) && i !== activeIndex && 'border-l-2 border-brand-500/60',
              )}
              title={section.heading}
            >
              <span className="line-clamp-2">{section.heading || sectionLabel(i)}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-xs font-semibold text-text-primary" title={active.heading}>
              {active.heading || sectionLabel(activeIndex)}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => goToSection(activeIndex - 1)}
                className="rounded-md p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
                aria-label={t('reprocessPrevSection')}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={activeIndex >= sections.length - 1}
                onClick={() => goToSection(activeIndex + 1)}
                className="rounded-md p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
                aria-label={t('reprocessNextSection')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-accent-rose">
                  {t('reprocessReaderBeforeReadonly')}
                </p>
                <button
                  type="button"
                  onClick={() => beforeRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="rounded p-0.5 text-text-muted hover:bg-surface-hover"
                  title={t('reprocessScrollTop')}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
              </div>
              <div
                ref={beforeRef}
                onScroll={() => handleSyncScroll('before')}
                style={{ height: heightPx }}
                className="reprocess-editor-pane overflow-y-auto rounded-xl border border-accent-rose/25 bg-surface-primary/60 p-3 text-[11px] leading-relaxed text-text-secondary whitespace-pre-wrap font-mono"
                data-testid="reprocess-before-pane"
              >
                {active.beforeText || '—'}
              </div>
              <p className="mt-1 text-[9px] text-text-muted">
                {countWords(active.beforeText)} {t('words')}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-accent-emerald">
                  {t('reprocessReaderAfterEditable')}
                </p>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => afterRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="rounded p-0.5 text-text-muted hover:bg-surface-hover"
                    title={t('reprocessScrollTop')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = afterRef.current;
                      if (el) el.scrollTop = el.scrollHeight;
                    }}
                    className="rounded p-0.5 text-text-muted hover:bg-surface-hover"
                    title={t('reprocessScrollBottom')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea
                ref={afterRef}
                value={active.editedText}
                onChange={(e) => updateSection(activeIndex, { editedText: e.target.value })}
                onScroll={() => handleSyncScroll('after')}
                style={{ height: heightPx }}
                spellCheck
                className={cn(
                  'reprocess-editor-pane w-full resize-y overflow-y-auto rounded-xl border bg-surface-primary/60 p-3 text-[11px] leading-relaxed text-text-primary font-mono',
                  sectionHasManualEdits(active)
                    ? 'border-brand-600/50 ring-1 ring-brand-600/20'
                    : 'border-accent-emerald/30 focus:border-accent-emerald/50',
                )}
                data-testid="reprocess-after-editor"
                aria-label={t('reprocessEditSectionAria')}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-[9px] text-text-muted">
                  {countWords(active.editedText)} {t('words')}
                  {sectionHasManualEdits(active) && (
                    <span className="ml-1 text-brand-700">· {t('reprocessModified')}</span>
                  )}
                </p>
                <div className="ml-auto flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => updateSection(activeIndex, {
                      editedText: normalizeSectionText(active.editedText),
                    })}
                    className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-0.5 text-[9px] text-text-secondary hover:bg-surface-hover"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('reprocessNormalize')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSection(activeIndex, { editedText: active.pipelineText })}
                    className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-0.5 text-[9px] text-text-muted hover:bg-surface-hover"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('reprocessResetPipeline')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-text-muted">{t('reprocessKeyboardHint')}</p>
        </div>
      </div>
    </div>
  );
}

export function useReprocessEditorState(initialSections: ReprocessEditorSection[]) {
  const [sections, setSections] = useState(() => cloneReprocessSections(initialSections));

  useEffect(() => {
    setSections(cloneReprocessSections(initialSections));
  }, [initialSections]);

  return [sections, setSections] as const;
}
