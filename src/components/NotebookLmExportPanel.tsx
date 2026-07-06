import { useState } from 'react';
import { ExternalLink, Loader2 } from '@/lib/lucide-shim';
import type { Course, GlossaryEntry, LearnerModel } from '../types';
import { cn } from '../utils/cn';
import {
  buildNotebookLmExportPayload,
  exportToNotebookLm,
  type NotebookLmExportKind,
} from '../lib/notebooklmExport';

type Props = {
  course: Course;
  glossaryEntries?: GlossaryEntry[];
  learnerModel?: LearnerModel;
  lang: 'en' | 'el';
  className?: string;
};

const EXPORT_OPTIONS: { kind: NotebookLmExportKind; labelEn: string; labelEl: string }[] = [
  { kind: 'study-guide', labelEn: 'Study guide + glossary', labelEl: 'Οδηγός + γλωσσάρι' },
  { kind: 'review-pack', labelEn: 'Weak-area review pack', labelEl: 'Review pack αδυναμιών' },
  { kind: 'fsrs-due', labelEn: 'FSRS due checklist', labelEl: 'FSRS due checklist' },
];

export function NotebookLmExportPanel({
  course,
  glossaryEntries = [],
  learnerModel,
  lang,
  className,
}: Props) {
  const el = lang === 'el';
  const [busy, setBusy] = useState<NotebookLmExportKind | null>(null);
  const [lastHint, setLastHint] = useState<string | null>(null);

  const handleExport = async (kind: NotebookLmExportKind) => {
    setBusy(kind);
    try {
      const payload = buildNotebookLmExportPayload(kind, {
        course,
        glossary: glossaryEntries,
        learnerModel,
        lang,
      });
      const { copied } = await exportToNotebookLm(payload, lang);
      setLastHint(
        copied
          ? el
            ? 'Αντιγράφηκε στο clipboard · άνοιξε NotebookLM και πρόσθεσε πηγή.'
            : 'Copied to clipboard · open NotebookLM and add as source.'
          : el
            ? 'Λήφθηκε .md · επικόλλησε στο NotebookLM.'
            : 'Downloaded .md · paste into NotebookLM.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={cn('ws-bento p-4', className)}
      data-testid="notebooklm-export-panel"
    >
      <p className="text-sm font-semibold text-text-primary mb-1">
        {el ? 'Εξαγωγή → NotebookLM' : 'Export → NotebookLM'}
      </p>
      <p className="text-[10px] text-text-secondary mb-3">
        {el
          ? 'Αντιγραφή markdown + άνοιγμα NotebookLM για paste ως νέα πηγή.'
          : 'Copy markdown + open NotebookLM to paste as a new source.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {EXPORT_OPTIONS.map((opt) => (
          <button
            key={opt.kind}
            type="button"
            disabled={busy != null}
            onClick={() => void handleExport(opt.kind)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-500/10 disabled:opacity-50"
            data-testid={`notebooklm-export-${opt.kind}`}
          >
            {busy === opt.kind ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            {el ? opt.labelEl : opt.labelEn}
          </button>
        ))}
      </div>
      {lastHint && (
        <p className="mt-2 text-[10px] text-accent-emerald font-medium" data-testid="notebooklm-export-hint">
          {lastHint}
        </p>
      )}
    </div>
  );
}
