import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, FileText, Library } from '@/lib/lucide-shim';
import type { Course, MessageCitation, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { runMultiDocSynthesize } from '../features/agent';

type Props = {
  courses: Course[];
  settings?: UserSettings;
  lang: 'en' | 'el';
  className?: string;
};

/* OPT-K101 β€” residual markup debt: decorative brand type -> ink */
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
      ? 'Ξ ΞΏΞΉΞ± ΞµΞ―Ξ½Ξ±ΞΉ Ο„Ξ± ΞΊΟΟΞΉΞ± ΞΈΞ­ΞΌΞ±Ο„Ξ± ΞΊΞ±ΞΉ ΞΏΞΉ ΟƒΟ‡Ξ­ΟƒΞµΞΉΟ‚ ΞΌΞµΟ„Ξ±ΞΎΟ Ο„Ο‰Ξ½ ΞµΞ³Ξ³ΟΞ¬Ο†Ο‰Ξ½ ΞΌΞΏΟ…;'
      : 'What are the main themes and connections across my documents?';

  const runSynthesis = async () => {
    if (!token || !settings) {
      setError(lang === 'el' ? 'Ξ‘Ο€Ξ±ΞΉΟ„ΞµΞ―Ο„Ξ±ΞΉ ΟƒΟΞ½Ξ΄ΞµΟƒΞ· ΟƒΟ„ΞΏ proxy.' : 'Proxy sign-in required.');
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

  const title = lang === 'el' ? 'Ξ£Ο…Ξ½Ξ΄Ο…Ξ±ΟƒΟ„ΞΉΞΊΞ® ΞΌΞµΞ»Ξ­Ο„Ξ·' : 'Combined study';
  const promo =
    lang === 'el'
      ? 'Ξ”Ξ·ΞΌΞΉΞΏΟ…ΟΞ³Ξ®ΟƒΟ„Ξµ ΟƒΟ…Ξ½ΞΈΞµΟ„ΞΉΞΊΞ­Ο‚ ΞΊΞ¬ΟΟ„ΞµΟ‚ ΞΊΞ±ΞΉ ΞµΟΟ‰Ο„Ξ®ΟƒΞµΞΉΟ‚ ΟƒΟ…Ξ½Ξ΄Ο…Ξ¬Ξ¶ΞΏΞ½Ο„Ξ±Ο‚ ΟΞ»Ξ· Ξ±Ο€Ο 2+ ΞΌΞ±ΞΈΞ®ΞΌΞ±Ο„Ξ±.'
      : 'Create synthetic cards and questions by combining material from 2+ courses.';
  const selectLabel = lang === 'el' ? 'Ξ•Ο€ΞΉΞ»ΞΏΞ³Ξ®' : 'Select';
  const subtitle =
    lang === 'el'
      ? 'Ξ£ΟΞ½ΞΈΞµΟƒΞ· ΞΈΞµΞΌΞ¬Ο„Ο‰Ξ½ ΞΌΞµ Ο€Ξ·Ξ³Ξ­Ο‚ Ξ±Ο€Ο ΟΞ»Ξ± Ο„Ξ± Ξ­Ξ³Ξ³ΟΞ±Ο†Ξ± Ο„Ξ·Ο‚ Ξ²ΞΉΞ²Ξ»ΞΉΞΏΞΈΞ®ΞΊΞ·Ο‚.'
      : 'Theme digest with citations across your library documents.';

  return (
    <div
      className={cn(
        'ux-combined-study rounded-xl border overflow-hidden',
        'border-brand-500/25 bg-gradient-to-r from-brand-500/[0.10] via-brand-500/[0.05] to-transparent',
        className,
      )}
      data-testid="cross-library-synthesis"
      data-promo="combined-study"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="ux-combined-study-icon flex h-7 w-7 items-center justify-center rounded-lg shrink-0">
          <Library className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-text-primary">{title}</span>
          {/* Promo ink uses theme secondary (warm sepia / spectrum ink / blueprint slate)
              β€” hardcoded violet-300 was ~1.5:1 on light cards. */}
          <span className="ux-combined-study-promo block type-micro line-clamp-1">{promo}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ux-combined-study-action shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg type-micro font-semibold border"
          data-testid="cross-library-synthesis-select"
        >
          {selectLabel}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {open && (
        <div className="px-3.5 pb-3 space-y-2 border-t border-brand-500/20 pt-2.5 bg-surface-primary/30">
          <p className="text-xs text-text-secondary">{subtitle}</p>
          {!token && (
            <p className="text-xs text-text-muted" data-testid="cross-library-synthesis-demo-hint">
              {lang === 'el'
                ? 'Ξ£Ο…Ξ½Ξ΄Ξ­ΟƒΞΏΟ… ΟƒΟ„ΞΏ proxy Ξ³ΞΉΞ± ΟƒΟΞ½ΞΈΞµΟƒΞ· ΞΌΞµΟ„Ξ±ΞΎΟ ΞΌΞ±ΞΈΞ·ΞΌΞ¬Ο„Ο‰Ξ½. Ξ¤Ξ± demo ΞΌΞ­Ξ½ΞΏΟ…Ξ½ Ο„ΞΏΟ€ΞΉΞΊΞ¬ ΞΌΞ­Ο‡ΟΞΉ Ο„ΟΟ„Ξµ.'
                : 'Sign in to the proxy to synthesize across courses. Demo libraries stay local until then.'}
            </p>
          )}
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && token && !busy) {
                e.preventDefault();
                void runSynthesis();
              }
            }}
            placeholder={defaultQuery}
            rows={2}
            className="w-full rounded-lg border border-brand-500/25 bg-surface-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-brand-500/35"
            data-testid="cross-library-synthesis-query"
          />
          {courses.length > 0 && (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-brand-500/25 bg-surface-primary px-2 py-1 text-xs text-text-primary"
              data-testid="cross-library-synthesis-scope"
            >
              <option value="all">{lang === 'el' ? 'ΞΞ»Ξ± Ο„Ξ± ΞΌΞ±ΞΈΞ®ΞΌΞ±Ο„Ξ±' : 'All courses'}</option>
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
            className="ux-combined-study-cta inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-55"
            data-testid="cross-library-synthesis-run"
            title={!token ? (lang === 'el' ? 'Ξ‘Ο€Ξ±ΞΉΟ„ΞµΞ―Ο„Ξ±ΞΉ ΟƒΟΞ½Ξ΄ΞµΟƒΞ·' : 'Sign-in required') : undefined}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {busy
              ? lang === 'el'
                ? 'Ξ£ΟΞ½ΞΈΞµΟƒΞ·β€¦'
                : 'Synthesizingβ€¦'
              : lang === 'el'
                ? 'Ξ£ΟΞ½ΞΈΞµΟƒΞ·'
                : 'Synthesize'}
          </button>
          {error && (
            <p className="text-xs text-accent-rose" data-testid="cross-library-synthesis-error" role="alert">
              {error}
            </p>
          )}
          {synthesis && (
            <pre
              className="text-xs text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto p-2 rounded-lg bg-surface-secondary/40 border border-brand-500/20"
              data-testid="cross-library-synthesis-result"
            >
              {synthesis}
            </pre>
          )}
          {citations.length > 0 && (
            <div className="rounded-lg border border-brand-500/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setCitationsOpen((v) => !v)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                <FileText className="w-3 h-3" />
                {citations.length}{' '}
                {lang === 'el'
                  ? citations.length === 1
                    ? 'Ο€Ξ·Ξ³Ξ®'
                    : 'Ο€Ξ·Ξ³Ξ­Ο‚'
                  : citations.length === 1
                    ? 'source'
                    : 'sources'}
                {citationsOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {citationsOpen && (
                <ul className="divide-y divide-border-subtle/60 max-h-32 overflow-y-auto">
                  {citations.map((c) => (
                    <li key={c.chunkId} className="px-2 py-1.5 text-xs">
                      <p className="font-medium text-text-primary truncate">
                        {c.fileName} Β· {c.locator}
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
