import { useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'framer-motion';

import { ArrowRight, CheckCircle2, Cpu, Maximize2, Minimize2, X } from '@/lib/lucide-shim';

import { cn } from '../utils/cn';
import { t, type Lang } from '../lib/i18n';
import type { ReprocessPreview } from '../lib/reprocessPreview';

import { countManualEdits, mergeReprocessSections } from '../lib/reprocessEditorSections';

import { ReprocessTextEditor, useReprocessEditorState } from './reprocess/ReprocessTextEditor';



type Props = {

  open: boolean;

  onClose: () => void;

  preview: ReprocessPreview | null;

  lang: Lang;

  applying?: boolean;

  applied?: boolean;

  onApply?: (editedText?: string) => void;

};



type EditorTab = 'overview' | 'edit';



function StepRailPreview({

  titles,

  lang,

  side,

  onSelectIndex,

}: {

  titles: ReprocessPreview['beforeStepTitles'];

  lang: Lang;

  side: 'before' | 'after';

  onSelectIndex?: (index: number) => void;

}) {

  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);

  if (titles.length === 0) {

    return (

      <p className="text-[10px] text-text-muted">

        {tr('reprocessNoSteps')}

      </p>

    );

  }



  return (

    <div className="flex flex-wrap gap-1" data-testid={`reprocess-steps-${side}`}>

      {titles.map((step, i) => (

        <button

          key={`${side}-${i}-${step.title}`}

          type="button"

          onClick={() => onSelectIndex?.(i)}

          className={cn(

            'inline-flex max-w-[160px] truncate rounded-full border px-2 py-0.5 text-[9px] transition-colors',

            onSelectIndex && 'hover:ring-1 hover:ring-brand-500/30 cursor-pointer',

            step.garbage

              ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'

              : side === 'after'

                ? 'border-accent-emerald/35 bg-accent-emerald/10 text-accent-emerald'

                : 'border-white/10 bg-surface-card/60 text-text-secondary',

          )}

          title={step.title}

        >

          {step.title.length > 22 ? `${step.title.slice(0, 20)}…` : step.title}

        </button>

      ))}

    </div>

  );

}



export function ReprocessPreviewModal({

  open,

  onClose,

  preview,

  lang,

  applying = false,

  applied = false,

  onApply,

}: Props) {

  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [tab, setTab] = useState<EditorTab>('edit');

  const [fullscreen, setFullscreen] = useState(false);

  const [editorFocusIndex, setEditorFocusIndex] = useState(0);



  const initialSections = useMemo(

    () => preview?.sections ?? [],

    [preview?.sections],

  );

  const [sections, setSections] = useReprocessEditorState(initialSections);

  const manualEdits = countManualEdits(sections);



  useEffect(() => {

    if (!open) return;

    setTab('edit');

    setFullscreen(false);

    setEditorFocusIndex(0);

    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape' && !applying) onClose();

    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);

  }, [open, applying, onClose]);



  const handleApplyClick = () => {

    if (!onApply) return;

    const merged = manualEdits > 0 ? mergeReprocessSections(sections) : undefined;

    onApply(merged);

  };



  const openEditorAtSection = (index: number) => {

    setEditorFocusIndex(index);

    setTab('edit');

  };



  return typeof document !== 'undefined'

    ? createPortal(

    <AnimatePresence>

      {open && (

        <div

          className={cn(

            'fixed inset-0 z-[260] flex justify-center p-4',

            fullscreen ? 'items-stretch' : 'items-end sm:items-center',

          )}

          role="presentation"

        >

          <motion.button

            type="button"

            aria-label={tr('close')}

            className="absolute inset-0 bg-black/60 backdrop-blur-sm"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            onClick={() => !applying && onClose()}

          />

          <motion.div

            role="dialog"

            aria-modal="true"

            aria-labelledby="reprocess-preview-title"

            data-testid="reprocess-preview-modal"

            initial={{ opacity: 0, y: 24, scale: 0.98 }}

            animate={{ opacity: 1, y: 0, scale: 1 }}

            exit={{ opacity: 0, y: 16, scale: 0.98 }}

            className={cn(

              'relative z-10 flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-2xl',

              fullscreen

                ? 'h-[96vh] w-[min(96vw,1400px)]'

                : 'max-h-[90vh] w-full max-w-5xl',

            )}

          >

            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">

              <div>

                <h2 id="reprocess-preview-title" className="text-base font-semibold text-text-primary">

                  {tr('reprocessTitle')}

                </h2>

                <p className="mt-1 text-xs text-text-muted">

                  {tr('reprocessSubtitle')}

                </p>

              </div>

              <div className="flex items-center gap-1">

                <button

                  type="button"

                  onClick={() => setFullscreen((v) => !v)}

                  disabled={applying}

                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"

                  aria-label={fullscreen ? tr('reprocessExitFullscreen') : tr('reprocessFullscreen')}

                >

                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}

                </button>

                <button

                  type="button"

                  onClick={onClose}

                  disabled={applying}

                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"

                >

                  <X className="h-4 w-4" />

                </button>

              </div>

            </div>



            {!preview ? (

              <div className="p-8 text-center text-sm text-text-muted">

                {tr('reprocessNoPreview')}

              </div>

            ) : applied ? (

              <div className="space-y-4 p-6" data-testid="reprocess-preview-success">

                <div className="flex items-start gap-3 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 p-4">

                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-emerald" />

                  <div>

                    <p className="text-sm font-semibold text-accent-emerald">

                      {tr('reprocessApplied')}

                    </p>

                    <p className="mt-1 text-xs text-text-secondary">

                      {tr('reprocessAppliedDetail')
                        .replace('{score}', String(preview.afterScore))
                        .replace('{version}', String(preview.pipelineVersionAfter))}

                    </p>

                  </div>

                </div>

                <div>

                  <p className="mb-2 text-[10px] font-medium text-text-muted">

                    {tr('reprocessUpdatedSteps')}

                  </p>

                  <StepRailPreview titles={preview.afterStepTitles} lang={lang} side="after" />

                </div>

              </div>

            ) : (

              <>

                <div className="flex gap-1 border-b border-border-subtle px-5 pt-2">

                  {(['edit', 'overview'] as const).map((id) => (

                    <button

                      key={id}

                      type="button"

                      onClick={() => setTab(id)}

                      className={cn(

                        'rounded-t-lg px-3 py-2 text-xs font-medium transition-colors',

                        tab === id

                          ? 'bg-surface-primary text-text-primary border border-border-subtle border-b-transparent -mb-px'

                          : 'text-text-muted hover:text-text-secondary',

                      )}

                    >

                      {id === 'edit' ? tr('reprocessTextEditor') : tr('reprocessOverview')}

                      {id === 'edit' && manualEdits > 0 && (

                        <span className="ml-1.5 rounded-full bg-brand-600/20 px-1.5 text-[9px] text-brand-800">

                          {manualEdits}

                        </span>

                      )}

                    </button>

                  ))}

                </div>



                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  <div

                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface-primary/40 px-4 py-3"

                    data-testid="reprocess-preview-scores"

                  >

                    <div className="text-center">

                      <p className="text-[10px] text-text-muted">{tr('reprocessBefore')}</p>

                      <p className="text-2xl font-bold text-accent-rose">{preview.beforeScore}</p>

                    </div>

                    <ArrowRight className="h-4 w-4 text-text-muted" />

                    <div className="text-center">

                      <p className="text-[10px] text-text-muted">{tr('reprocessAfter')}</p>

                      <p className="text-2xl font-bold text-accent-emerald">{preview.afterScore}</p>

                    </div>

                    <div className="ml-auto text-right text-[10px] text-text-muted">

                      <p>

                        {tr('reprocessSections')}: {preview.sectionCountBefore} → {preview.sectionCountAfter}

                      </p>

                      <p>

                        {tr('reprocessTopics')}: {preview.topicCountBefore} → {preview.topicCountAfter}

                      </p>

                      {preview.scoreDelta !== 0 && (

                        <p className={cn('font-semibold', preview.scoreDelta > 0 ? 'text-accent-emerald' : 'text-accent-rose')}>

                          {preview.scoreDelta > 0 ? '+' : ''}{preview.scoreDelta} {tr('reprocessPoints')}

                        </p>

                      )}

                    </div>

                  </div>

                  {preview.warnings.length > 0 && (
                    <ul
                      className="space-y-1 rounded-lg border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
                      data-testid="reprocess-preview-warnings"
                    >
                      {preview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}

                  {tab === 'edit' ? (

                    <ReprocessTextEditor

                      key={`editor-${editorFocusIndex}`}

                      sections={sections}

                      lang={lang}

                      onChange={setSections}

                      initialSectionIndex={editorFocusIndex}

                    />

                  ) : (

                    <>

                      <div className="grid gap-4 sm:grid-cols-2">

                        <div>

                          <p className="mb-2 text-[10px] font-semibold text-accent-rose">

                            {tr('reprocessReaderBefore')}

                          </p>

                          <pre

                            className="max-h-40 overflow-auto rounded-xl border border-accent-rose/20 bg-surface-primary/60 p-3 text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap font-mono"

                            data-testid="reprocess-snippet-before"

                          >

                            {preview.beforeSnippet || '—'}

                          </pre>

                        </div>

                        <div>

                          <p className="mb-2 text-[10px] font-semibold text-accent-emerald">

                            {tr('reprocessReaderAfter')}

                          </p>

                          <pre

                            className="max-h-40 overflow-auto rounded-xl border border-accent-emerald/25 bg-surface-primary/60 p-3 text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap font-mono"

                            data-testid="reprocess-snippet-after"

                          >

                            {preview.afterSnippet || '—'}

                          </pre>

                        </div>

                      </div>



                      <div className="grid gap-4 sm:grid-cols-2">

                        <div>

                          <p className="mb-2 text-[10px] font-semibold text-text-muted">

                            {tr('reprocessStepRailBefore')}

                          </p>

                          <StepRailPreview titles={preview.beforeStepTitles} lang={lang} side="before" />

                        </div>

                        <div>

                          <p className="mb-2 text-[10px] font-semibold text-text-muted">

                            {tr('reprocessStepRailAfter')}

                          </p>

                          <StepRailPreview

                            titles={preview.afterStepTitles}

                            lang={lang}

                            side="after"

                            onSelectIndex={openEditorAtSection}

                          />

                        </div>

                      </div>

                    </>

                  )}



                  {!preview.hasMaterialChanges && (

                    <p className="rounded-lg border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber">

                      {tr('reprocessLittleChange')}

                    </p>

                  )}

                </div>

              </>

            )}



            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-5 py-4">

              {!applied && preview && manualEdits > 0 && (

                <p className="text-[10px] text-brand-700">

                  {tr('reprocessManualEditsFooter').replace('{count}', String(manualEdits))}

                </p>

              )}

              <div className="ml-auto flex flex-wrap justify-end gap-2">

                {applied ? (

                  <button

                    type="button"

                    onClick={onClose}

                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"

                    data-testid="reprocess-preview-done"

                  >

                    {tr('reprocessDone')}

                  </button>

                ) : (

                  <>

                    <button

                      ref={cancelRef}

                      type="button"

                      onClick={onClose}

                      disabled={applying}

                      className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"

                    >

                      {tr('cancel')}

                    </button>

                    {onApply && (

                      <button

                        type="button"

                        onClick={handleApplyClick}

                        disabled={applying || !preview}

                        data-testid="reprocess-preview-apply"

                        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"

                      >

                        <Cpu className={cn('h-4 w-4', applying && 'animate-pulse')} />

                        {applying

                          ? tr('reprocessApplying')
                          : tr('reprocessApply')}

                      </button>

                    )}

                  </>

                )}

              </div>

            </div>

          </motion.div>

        </div>

      )}

    </AnimatePresence>,

    document.body,

  )

    : null;

}


