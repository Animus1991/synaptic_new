import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Trash2, CheckCircle2, Circle, Sparkles, Highlighter, Layers,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  type ScratchpadMode,
  type ScratchpadEntry,
  SCRATCHPAD_MODE_LABELS,
  loadScratchpadEntries,
  saveScratchpadEntries,
  createScratchpadEntry,
  buildFlashcardFromEntry,
} from '../../lib/scratchpadEntryStore';

interface Props {
  scopeKey: string;
  concept?: string;
  sectionLabel?: string;
  sectionIndex?: number;
  lang?: 'en' | 'el';
  /** Sync with legacy session notes slide-over. */
  draft?: string;
  onDraftChange?: (text: string) => void;
  onEntrySaved?: (entry: ScratchpadEntry) => void;
  onConvertToFlashcard?: (card: { front: string; back: string }, entry: ScratchpadEntry) => void;
  onConvertToAnnotation?: (entry: ScratchpadEntry) => void;
  onAskAgent?: (text: string, mode: ScratchpadMode) => void;
}

const MODES: ScratchpadMode[] = [
  'free',
  'self-explanation',
  'problem-attempt',
  'summary',
  'confusion-log',
  'exam-draft',
];

export function ScratchpadNotesPanel({
  scopeKey,
  concept,
  sectionLabel,
  sectionIndex,
  lang = 'en',
  draft: draftProp,
  onDraftChange,
  onEntrySaved,
  onConvertToFlashcard,
  onConvertToAnnotation,
  onAskAgent,
}: Props) {
  const [entries, setEntries] = useState<ScratchpadEntry[]>(() => loadScratchpadEntries(scopeKey));
  const [mode, setMode] = useState<ScratchpadMode>('free');
  const [draft, setDraft] = useState(draftProp ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setEntries(loadScratchpadEntries(scopeKey));
  }, [scopeKey]);

  useEffect(() => {
    saveScratchpadEntries(scopeKey, entries);
  }, [scopeKey, entries]);

  useEffect(() => {
    if (draftProp !== undefined) setDraft(draftProp);
  }, [draftProp]);

  const updateDraft = useCallback((text: string) => {
    setDraft(text);
    onDraftChange?.(text);
  }, [onDraftChange]);

  const saveEntry = () => {
    if (!draft.trim()) return;
    const entry = createScratchpadEntry(draft, { mode, concept, sectionLabel, sectionIndex });
    setEntries((prev) => [entry, ...prev]);
    updateDraft('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    onEntrySaved?.(entry);
  };

  const toggleResolved = (id: string) => {
    setEntries((prev) => prev.map((e) =>
      e.id === id ? { ...e, resolved: !e.resolved, updatedAt: new Date().toISOString() } : e,
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = entries.find((e) => e.id === selectedId);

  const modePlaceholder = (m: ScratchpadMode): string => {
    if (lang === 'el') {
      switch (m) {
        case 'self-explanation': return 'Εξήγησε με δικά σου λόγια…';
        case 'problem-attempt': return 'Δοκίμασε να λύσεις το πρόβλημα…';
        case 'confusion-log': return 'Τι σε μπερδεύει;';
        case 'exam-draft': return 'Πρόχειρη απάντηση εξέτασης…';
        case 'summary': return 'Σύνοψη ενότητας…';
        default: return 'Γράψε τις σκέψεις σου…';
      }
    }
    switch (m) {
      case 'self-explanation': return 'Explain in your own words…';
      case 'problem-attempt': return 'Work through the problem…';
      case 'confusion-log': return 'What is confusing?';
      case 'exam-draft': return 'Draft exam answer…';
      case 'summary': return 'Section summary…';
      default: return 'Write your thinking…';
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="scratchpad-notes-panel">
      {(sectionLabel || concept) && (
        <div className="px-4 py-1.5 border-b border-border-subtle bg-surface-primary/30 text-[10px] text-text-muted shrink-0">
          {lang === 'el' ? 'Συνδεδεμένο με' : 'Attached to'}
          {sectionLabel && <span className="ml-1 text-brand-300">§ {sectionLabel}</span>}
          {concept && sectionLabel !== concept && <span className="ml-1 text-accent-cyan">· {concept}</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border-subtle shrink-0">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`scratchpad-mode-${m}`}
            onClick={() => setMode(m)}
            className={cn(
              'px-2 py-0.5 rounded text-[9px] font-medium border transition-all',
              mode === m
                ? 'border-brand-400/50 bg-brand-500/15 text-brand-300'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
          >
            {SCRATCHPAD_MODE_LABELS[m][lang]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <textarea
          value={draft}
          onChange={(e) => updateDraft(e.target.value)}
          placeholder={modePlaceholder(mode)}
          data-testid="scratchpad-notes-draft"
          className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 resize-y"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveEntry}
            disabled={!draft.trim()}
            data-testid="scratchpad-save-entry"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            {savedFlash
              ? (lang === 'el' ? 'Αποθηκεύτηκε!' : 'Saved!')
              : (lang === 'el' ? 'Αποθήκευση' : 'Save entry')}
          </button>
          {onAskAgent && draft.trim() && (
            <button
              type="button"
              onClick={() => onAskAgent(draft, mode)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Agent
            </button>
          )}
        </div>

        {entries.length > 0 && (
          <div className="pt-2 space-y-1.5">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
              {lang === 'el' ? 'Αποθηκευμένες' : 'Saved'} ({entries.length})
            </p>
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'p-2 rounded-lg border text-[11px] cursor-pointer transition-all',
                    selectedId === entry.id ? 'border-brand-400/40 bg-brand-500/8' : 'border-border-subtle hover:border-brand-500/20',
                    entry.resolved && 'opacity-60',
                  )}
                  onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] text-brand-300 font-medium">
                      {SCRATCHPAD_MODE_LABELS[entry.mode][lang]}
                      {entry.sectionLabel && <span className="text-text-muted ml-1">· {entry.sectionLabel}</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleResolved(entry.id); }}
                        className="text-text-muted hover:text-accent-emerald"
                        title={lang === 'el' ? 'Επιλύθηκε' : 'Resolved'}
                      >
                        {entry.resolved ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" /> : <Circle className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                        className="text-text-muted hover:text-accent-rose"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-text-secondary line-clamp-3 whitespace-pre-wrap">{entry.body}</p>
                  {selectedId === entry.id && (
                    <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-border-subtle/60">
                      {onConvertToFlashcard && (
                        <button
                          type="button"
                          data-testid="scratchpad-to-flashcard"
                          onClick={() => onConvertToFlashcard(buildFlashcardFromEntry(entry), entry)}
                          className="flex items-center gap-1 text-[9px] text-accent-amber hover:text-accent-amber/80"
                        >
                          <Layers className="w-3 h-3" />
                          {lang === 'el' ? '→ Κάρτα' : '→ Flashcard'}
                        </button>
                      )}
                      {onConvertToAnnotation && (
                        <button
                          type="button"
                          data-testid="scratchpad-to-annotation"
                          onClick={() => onConvertToAnnotation(entry)}
                          className="flex items-center gap-1 text-[9px] text-accent-cyan hover:text-accent-cyan/80"
                        >
                          <Highlighter className="w-3 h-3" />
                          {lang === 'el' ? '→ Σχόλιο' : '→ Annotation'}
                        </button>
                      )}
                      {onAskAgent && (
                        <button
                          type="button"
                          onClick={() => onAskAgent(entry.body, entry.mode)}
                          className="flex items-center gap-1 text-[9px] text-brand-400"
                        >
                          <Sparkles className="w-3 h-3" />
                          Agent
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selected && (
        <div className="px-3 py-1 border-t border-border-subtle text-[9px] text-text-muted shrink-0">
          {lang === 'el' ? 'Επιλεγμένη καταχώρηση' : 'Selected entry'} · {selected.updatedAt.slice(0, 10)}
        </div>
      )}
    </div>
  );
}
