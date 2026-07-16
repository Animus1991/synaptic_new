import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, FileText, Library } from '@/lib/lucide-shim';
import type { Course, MessageCitation, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { runMultiDocSynthesize } from '../lib/agentMultiDocSynthesize';

type Props = {
  courses: Course[];
  settings?: UserSettings;
  lang: 'en' | 'el';
  className?: string;
};

export function CrossLibrarySynthesisPanel({ courses, settings, lang, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | string>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [citations, setCitations] = useState<MessageCitation[]>([]);
  const [citationsOpen, setCitationsOpen] = useState(true);

  const token = settings?.authToken?.trim();
  const defaultQuery =
    lang === 'el'
      ? 'Ποια είναι τα κύρια θέματα και οι σχέσεις μεταξύ των εγγράφων μου;'
      : 'What are the main themes and connections across my documents?';

  const runSynthesis = async () => {
    if (!token || !settings) {
      setError(lang === 'el' ? 'Απαιτείται σύνδεση στο proxy.' : 'Proxy sign-in required.');
      return;
    }
    setBusy(true);
    setError(null);
    setSynthesis(null);
    setCitations([]);
    try {
      const courseIds = scope === 'all' ? undefined : [scope];
      const result = await runMultiDocSynthesize(
        token,
        settings,
        query.trim() || defaultQuery,
        lang,
        courseIds,
      );
      setSynthesis(result.synthesis);
      setCitations(result.citations);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const title = lang === 'el' ? 'Συνδυαστική μελέτη' : 'Combined study';
  const promo =
    lang === 'el'
      ? 'Δημιουργήστε συνθετικές κάρτες και ερωτήσεις συνδυάζοντας ύλη από 2+ μαθήματα.'
      : 'Create synthetic cards and questions by combining material from 2+ courses.';
  const selectLabel = lang === 'el' ? 'Επιλογή' : 'Select';
  const subtitle =
    lang === 'el'
      ? 'Σύνθεση θεμάτων με πηγές από όλα τα έγγραφα της βιβλιοθήκης.'
      : 'Theme digest with citations across your library documents.';

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        'border-violet-500/25 bg-gradient-to-r from-violet-500/[0.08] via-violet-500/[0.04] to-transparent',
        className,
      )}
      data-testid="cross-library-synthesis"
      data-promo="combined-study"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 shrink-0">
          <Library className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-text-primary">{title}</span>
          {/* Wave P-3 L05 — single-line promo when collapsed keeps the card dense. */}
          <span className="block text-[10px] text-violet-300/80 line-clamp-1">{promo}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
          data-testid="cross-library-synthesis-select"
        >
          {selectLabel}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {open && (
        <div className="px-3.5 pb-3 space-y-2 border-t border-violet-500/15 pt-2.5 bg-surface-primary/30">
          <p className="text-[10px] text-text-secondary">{subtitle}</p>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={defaultQuery}
            rows={2}
            className="w-full rounded-lg border border-violet-500/20 bg-surface-primary px-2 py-1.5 text-[11px] text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            data-testid="cross-library-synthesis-query"
          />
          {courses.length > 0 && (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-violet-500/20 bg-surface-primary px-2 py-1 text-[11px]"
              data-testid="cross-library-synthesis-scope"
            >
              <option value="all">{lang === 'el' ? 'Όλα τα μαθήματα' : 'All courses'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={busy || !token}
            onClick={() => void runSynthesis()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-violet-500/35 text-violet-300 hover:bg-violet-500/10 disabled:opacity-60"
            data-testid="cross-library-synthesis-run"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {busy
              ? lang === 'el'
                ? 'Σύνθεση…'
                : 'Synthesizing…'
              : lang === 'el'
                ? 'Σύνθεση'
                : 'Synthesize'}
          </button>
          {error && <p className="text-[10px] text-accent-rose">{error}</p>}
          {synthesis && (
            <pre className="text-[10px] text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto p-2 rounded-lg bg-surface-secondary/40 border border-violet-500/15">
              {synthesis}
            </pre>
          )}
          {citations.length > 0 && (
            <div className="rounded-lg border border-violet-500/15 overflow-hidden">
              <button
                type="button"
                onClick={() => setCitationsOpen((v) => !v)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-text-tertiary hover:text-violet-300"
              >
                <FileText className="w-3 h-3" />
                {citations.length}{' '}
                {lang === 'el'
                  ? citations.length === 1
                    ? 'πηγή'
                    : 'πηγές'
                  : citations.length === 1
                    ? 'source'
                    : 'sources'}
                {citationsOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {citationsOpen && (
                <ul className="divide-y divide-border-subtle/60 max-h-32 overflow-y-auto">
                  {citations.map((c) => (
                    <li key={c.chunkId} className="px-2 py-1.5 text-[10px]">
                      <p className="font-medium text-violet-300 truncate">
                        {c.fileName} · {c.locator}
                      </p>
                      <p className="text-text-secondary mt-0.5 line-clamp-2">{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
