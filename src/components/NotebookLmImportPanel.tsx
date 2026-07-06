import { useRef, useState } from 'react';
import { BookOpen, Brain, ChevronDown, ChevronUp, Download, ExternalLink, Loader2 } from '@/lib/lucide-shim';
import type { NotebookLmImportResult } from '../lib/notebooklmImport';
import { openNotebookLm } from '../lib/notebooklmBridge';
import { NOTEBOOKLM_URL } from '../lib/platformFocus';
import { cn } from '../utils/cn';
import { downloadAnkiDeck } from '../lib/ankiExport';

type Props = {
  lang: 'en' | 'el';
  onImport: (raw: string) => NotebookLmImportResult | null;
  onAddToFsrs?: (result: NotebookLmImportResult) => { added: number } | null | void;
  className?: string;
};

export function NotebookLmImportPanel({ lang, onImport, onAddToFsrs, className }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<NotebookLmImportResult | null>(null);
  const [fsrsBusy, setFsrsBusy] = useState(false);
  const [lastFsrsAdded, setLastFsrsAdded] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const title = lang === 'el' ? 'Εισαγωγή από NotebookLM' : 'Import from NotebookLM';
  const hint =
    lang === 'el'
      ? 'Επικόλλησε σημείωμα, study guide, Studio Quiz ή chat transcript από το NotebookLM — δημιουργεί αρχείο στη βιβλιοθήκη.'
      : 'Paste a saved note, study guide, Studio Quiz, or chat transcript from NotebookLM — adds a library source for course generation.';

  const handleImport = async (raw: string) => {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const result = onImport(raw);
      if (result) {
        setLastResult(result);
        setLastFsrsAdded(null);
        setText('');
      }
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    setText(raw);
    await handleImport(raw);
  };

  const downloadQuizTsv = () => {
    if (!lastResult?.quizCards.length) return;
    downloadAnkiDeck(
      lastResult.quizCards.map((c) => ({ ...c, tags: ['synapse:notebooklm'] })),
      lastResult.title,
      `notebooklm-${lastResult.title.slice(0, 24).replace(/\s+/g, '-')}`,
      ['synapse:notebooklm'],
    );
  };

  const handleAddToFsrs = async () => {
    if (!lastResult?.quizCards.length || !onAddToFsrs) return;
    setFsrsBusy(true);
    try {
      const outcome = onAddToFsrs(lastResult);
      setLastFsrsAdded(outcome?.added ?? lastResult.quizCards.length);
    } finally {
      setFsrsBusy(false);
    }
  };

  return (
    <div
      className={cn('rounded-xl border border-brand-500/25 bg-brand-500/5', className)}
      data-testid="notebooklm-import-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <BookOpen className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0" />
        <span className="text-xs font-semibold text-text-primary flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-brand-500/15 pt-2">
          <p className="text-[10px] text-text-secondary">{hint}</p>
          <button
            type="button"
            onClick={() => void openNotebookLm({ lang })}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-700 dark:text-brand-300 hover:underline"
            data-testid="notebooklm-open-external"
          >
            <ExternalLink className="w-3 h-3" />
            {lang === 'el' ? 'Άνοιγμα NotebookLM' : 'Open NotebookLM'}
          </button>
          <p className="text-[10px] text-text-muted">
            {NOTEBOOKLM_URL}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={
              lang === 'el'
                ? 'Επικόλλησε markdown, study guide, Q/A quiz ή chat (User/NotebookLM)…'
                : 'Paste markdown, study guide, Q/A quiz, or chat (User/NotebookLM)…'
            }
            className="w-full rounded-lg border border-border-subtle bg-surface-input px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted resize-y min-h-[80px]"
            data-testid="notebooklm-import-text"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => void handleImport(text)}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-50"
              data-testid="notebooklm-import-submit"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : lang === 'el' ? 'Εισαγωγή' : 'Import'}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:bg-surface-hover"
            >
              {lang === 'el' ? 'Αρχείο .md/.txt' : '.md / .txt file'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
          {lastResult && (
            <div className="rounded-lg border border-border-subtle/60 bg-surface-input/50 px-2 py-1.5 text-[10px] text-text-secondary space-y-1">
              <p>
                {lang === 'el' ? 'Τελευταία εισαγωγή:' : 'Last import:'}{' '}
                <span className="font-medium text-text-primary">{lastResult.title}</span>
                {' · '}
                {lastResult.kind}
                {lastResult.quizCards.length > 0 && (
                  <>
                    {' · '}
                    {lastResult.quizCards.length} {lang === 'el' ? 'κάρτες quiz' : 'quiz cards'}
                  </>
                )}
                {lastResult.chatTurns.length > 0 && (
                  <>
                    {' · '}
                    {lastResult.chatTurns.length} {lang === 'el' ? 'γύροι chat' : 'chat turns'}
                  </>
                )}
              </p>
              {lastResult.quizCards.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {onAddToFsrs && (
                    <button
                      type="button"
                      disabled={fsrsBusy}
                      onClick={() => void handleAddToFsrs()}
                      className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 font-semibold hover:underline disabled:opacity-50"
                      data-testid="notebooklm-add-fsrs-deck"
                    >
                      {fsrsBusy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Brain className="w-3 h-3" />
                      )}
                      {lang === 'el' ? 'Προσθήκη στο FSRS deck' : 'Add to FSRS deck'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadQuizTsv}
                    className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 font-medium hover:underline"
                    data-testid="notebooklm-download-quiz-tsv"
                  >
                    <Download className="w-3 h-3" />
                    {lang === 'el' ? 'Λήψη Anki TSV' : 'Download Anki TSV'}
                  </button>
                </div>
              )}
              {lastFsrsAdded != null && (
                <p className="text-[10px] text-accent-emerald font-medium" data-testid="notebooklm-fsrs-added-hint">
                  {lang === 'el'
                    ? 'Άνοιξε Leitner στο Workspace για review.'
                    : 'Open Leitner in Workspace to review.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
