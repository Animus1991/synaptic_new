import { useState } from 'react';
import { ExternalLink, Loader2 } from '@/lib/lucide-shim';
import type { Course, GlossaryEntry, LearnerModel } from '../types';
import { cn } from '../utils/cn';
import { BlueprintSurface } from './ui/BlueprintSurface';
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
  { kind: 'study-guide', labelEn: 'Study guide + glossary', labelEl: 'ΞΞ΄Ξ·Ξ³ΟΟ‚ + Ξ³Ξ»Ο‰ΟƒΟƒΞ¬ΟΞΉ' },
  { kind: 'review-pack', labelEn: 'Weak-area review pack', labelEl: 'Review pack Ξ±Ξ΄Ο…Ξ½Ξ±ΞΌΞΉΟΞ½' },
  { kind: 'fsrs-due', labelEn: 'FSRS due checklist', labelEl: 'FSRS due checklist' },
];

/* OPT-K101 β€” residual markup debt: decorative brand type -> ink */
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
            ? 'Ξ‘Ξ½Ο„ΞΉΞ³ΟΞ¬Ο†Ξ·ΞΊΞµ ΟƒΟ„ΞΏ clipboard Β· Ξ¬Ξ½ΞΏΞΉΞΎΞµ NotebookLM ΞΊΞ±ΞΉ Ο€ΟΟΟƒΞΈΞµΟƒΞµ Ο€Ξ·Ξ³Ξ®.'
            : 'Copied to clipboard Β· open NotebookLM and add as source.'
          : el
            ? 'Ξ›Ξ®Ο†ΞΈΞ·ΞΊΞµ .md Β· ΞµΟ€ΞΉΞΊΟΞ»Ξ»Ξ·ΟƒΞµ ΟƒΟ„ΞΏ NotebookLM.'
            : 'Downloaded .md Β· paste into NotebookLM.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <BlueprintSurface
      className={cn('p-4', className)}
      data-testid="notebooklm-export-panel"
    >
      <p className="text-sm font-semibold text-text-primary mb-1">
        {el ? 'Ξ•ΞΎΞ±Ξ³Ο‰Ξ³Ξ® β†’ NotebookLM' : 'Export β†’ NotebookLM'}
      </p>
      <p className="type-micro text-text-secondary mb-3">
        {el
          ? 'Ξ‘Ξ½Ο„ΞΉΞ³ΟΞ±Ο†Ξ® markdown + Ξ¬Ξ½ΞΏΞΉΞ³ΞΌΞ± NotebookLM Ξ³ΞΉΞ± paste Ο‰Ο‚ Ξ½Ξ­Ξ± Ο€Ξ·Ξ³Ξ®.'
          : 'Copy markdown + open NotebookLM to paste as a new source.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {EXPORT_OPTIONS.map((opt) => (
          <button
            key={opt.kind}
            type="button"
            disabled={busy != null}
            onClick={() => void handleExport(opt.kind)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 text-xs font-medium text-text-primary dark:text-text-secondary hover:bg-brand-500/10 disabled:opacity-50"
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
        <p className="mt-2 type-micro text-accent-emerald font-medium" data-testid="notebooklm-export-hint">
          {lastHint}
        </p>
      )}
    </BlueprintSurface>
  );
}
