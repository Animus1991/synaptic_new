import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Cpu, X } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import type { ReprocessPreview } from '../lib/reprocessPreview';

type Props = {
  open: boolean;
  onClose: () => void;
  preview: ReprocessPreview | null;
  lang: 'en' | 'el';
  applying?: boolean;
  applied?: boolean;
  onApply?: () => void;
};

function StepRailPreview({
  titles,
  lang,
  side,
}: {
  titles: ReprocessPreview['beforeStepTitles'];
  lang: 'en' | 'el';
  side: 'before' | 'after';
}) {
  const isEl = lang === 'el';
  if (titles.length === 0) {
    return (
      <p className="text-[10px] text-text-muted italic">
        {isEl ? 'Δεν εντοπίστηκαν βήματα.' : 'No steps detected.'}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" data-testid={`reprocess-steps-${side}`}>
      {titles.map((step, i) => (
        <span
          key={`${side}-${i}-${step.title}`}
          className={cn(
            'inline-flex max-w-[160px] truncate rounded-full border px-2 py-0.5 text-[9px]',
            step.garbage
              ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
              : side === 'after'
                ? 'border-accent-emerald/35 bg-accent-emerald/10 text-accent-emerald'
                : 'border-white/10 bg-surface-card/60 text-text-secondary',
          )}
          title={step.title}
        >
          {step.title.length > 22 ? `${step.title.slice(0, 20)}…` : step.title}
        </span>
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
  const isEl = lang === 'el';
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, applying, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label={isEl ? 'Κλείσιμο' : 'Close'}
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
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
              <div>
                <h2 id="reprocess-preview-title" className="text-base font-semibold text-text-primary">
                  {isEl ? 'Προεπισκόπηση επανεπεξεργασίας' : 'Reprocess preview'}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {isEl
                    ? 'Δες τι θα αλλάξει στο Reader και στο step rail πριν εφαρμόσεις.'
                    : 'See Reader and step-rail changes before you apply.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={applying}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!preview ? (
              <div className="p-8 text-center text-sm text-text-muted">
                {isEl
                  ? 'Δεν βρέθηκε αποθηκευμένο κείμενο για προεπισκόπηση.'
                  : 'No stored text available for preview.'}
              </div>
            ) : applied ? (
              <div className="space-y-4 p-6" data-testid="reprocess-preview-success">
                <div className="flex items-start gap-3 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-emerald" />
                  <div>
                    <p className="text-sm font-semibold text-accent-emerald">
                      {isEl ? 'Η επανεπεξεργασία ολοκληρώθηκε' : 'Reprocess applied'}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {isEl
                        ? `Reader και step rail ενημερώθηκαν. Νέα ποιότητα: ${preview.afterScore}/100 · pipeline v${preview.pipelineVersionAfter}.`
                        : `Reader and step rail updated. New quality: ${preview.afterScore}/100 · pipeline v${preview.pipelineVersionAfter}.`}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                    {isEl ? 'Νέα βήματα μαθήματος' : 'Updated lesson steps'}
                  </p>
                  <StepRailPreview titles={preview.afterStepTitles} lang={lang} side="after" />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface-primary/40 px-4 py-3"
                  data-testid="reprocess-preview-scores"
                >
                  <div className="text-center">
                    <p className="text-[10px] text-text-muted">{isEl ? 'Πριν' : 'Before'}</p>
                    <p className="text-2xl font-bold text-accent-rose">{preview.beforeScore}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted" />
                  <div className="text-center">
                    <p className="text-[10px] text-text-muted">{isEl ? 'Μετά' : 'After'}</p>
                    <p className="text-2xl font-bold text-accent-emerald">{preview.afterScore}</p>
                  </div>
                  <div className="ml-auto text-right text-[10px] text-text-muted">
                    <p>
                      {isEl ? 'Ενότητες' : 'Sections'}: {preview.sectionCountBefore} → {preview.sectionCountAfter}
                    </p>
                    <p>
                      {isEl ? 'Topics' : 'Topics'}: {preview.topicCountBefore} → {preview.topicCountAfter}
                    </p>
                    {preview.scoreDelta !== 0 && (
                      <p className={cn('font-semibold', preview.scoreDelta > 0 ? 'text-accent-emerald' : 'text-accent-rose')}>
                        {preview.scoreDelta > 0 ? '+' : ''}{preview.scoreDelta} {isEl ? 'βαθμοί' : 'points'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-accent-rose">
                      {isEl ? 'Reader — πριν' : 'Reader — before'}
                    </p>
                    <pre
                      className="max-h-40 overflow-auto rounded-xl border border-accent-rose/20 bg-surface-primary/60 p-3 text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap font-mono"
                      data-testid="reprocess-snippet-before"
                    >
                      {preview.beforeSnippet || '—'}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-accent-emerald">
                      {isEl ? 'Reader — μετά' : 'Reader — after'}
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
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {isEl ? 'Step rail — πριν' : 'Step rail — before'}
                    </p>
                    <StepRailPreview titles={preview.beforeStepTitles} lang={lang} side="before" />
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {isEl ? 'Step rail — μετά' : 'Step rail — after'}
                    </p>
                    <StepRailPreview titles={preview.afterStepTitles} lang={lang} side="after" />
                  </div>
                </div>

                {!preview.hasMaterialChanges && (
                  <p className="rounded-lg border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber">
                    {isEl
                      ? 'Η προεπισκόπηση δείχνει μικρή ή καμία αλλαγή — ίσως χρειάζεται re-upload αρχείου.'
                      : 'Preview shows little or no change — you may need to re-upload the source file.'}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-4">
              {applied ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
                  data-testid="reprocess-preview-done"
                >
                  {isEl ? 'Έτοιμο' : 'Done'}
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
                    {isEl ? 'Ακύρωση' : 'Cancel'}
                  </button>
                  {onApply && (
                    <button
                      type="button"
                      onClick={onApply}
                      disabled={applying || !preview}
                      data-testid="reprocess-preview-apply"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
                    >
                      <Cpu className={cn('h-4 w-4', applying && 'animate-pulse')} />
                      {applying
                        ? (isEl ? 'Εφαρμογή…' : 'Applying…')
                        : (isEl ? 'Εφαρμογή επανεπεξεργασίας' : 'Apply reprocess')}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
