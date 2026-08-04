import { useEffect, useRef, useState } from 'react';
import { notifyError, notifySuccess } from '../lib/notificationBus';
import { Database, Loader2, AlertTriangle } from '@/lib/lucide-shim';
import { fetchRagStatus, type RagStatusResponse } from '../lib/orgClient';
import type { UserSettings } from '../types';
import { cn } from '../utils/cn';
import { useMinimalTheme } from '../lib/useMinimalTheme';

type Props = {
  settings?: UserSettings;
  lang: 'en' | 'el';
  variant?: 'banner' | 'panel';
  className?: string;
};

function isIndexingActive(row: RagStatusResponse): boolean {
  return row.indexing.status === 'queued' || row.indexing.status === 'processing';
}

export function RagIndexProgressBanner({
  settings,
  lang,
  variant = 'banner',
  className,
}: Props) {
  const token = settings?.authToken?.trim();
  const [status, setStatus] = useState<RagStatusResponse | null>(null);
  const wasIndexingRef = useRef(false);
  /** OPT-R11 β€” thin console pipeline strip under Minimal. */
  const consoleStrip = useMinimalTheme();

  useEffect(() => {
    if (!token || !settings) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const row = await fetchRagStatus(token, settings);
        if (cancelled) return;
        setStatus(row);
        if (isIndexingActive(row)) {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setStatus(null);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, settings]);

  useEffect(() => {
    if (!status) return;
    const active = isIndexingActive(status);
    if (wasIndexingRef.current && !active) {
      if (status.indexing.status === 'failed') {
        notifyError(
          lang === 'el' ? 'Ξ‘Ο€ΞΏΟ„Ο…Ο‡Ξ―Ξ± ΞµΟ…ΟΞµΟ„Ξ·ΟΞ―ΞΏΟ… RAG' : 'RAG indexing failed',
          status.indexing.error ?? undefined,
        );
      } else {
        notifySuccess(
          lang === 'el' ? 'Ξ•Ο…ΟΞµΟ„Ξ®ΟΞΉΞΏ RAG Ξ­Ο„ΞΏΞΉΞΌΞΏ' : 'RAG index ready',
          lang === 'el'
            ? `${status.indexedChunks} chunks Ξ΄ΞΉΞ±ΞΈΞ­ΟƒΞΉΞΌΞ± Ξ³ΞΉΞ± Ξ±Ξ½Ξ±Ξ¶Ξ®Ο„Ξ·ΟƒΞ·`
            : `${status.indexedChunks} chunks ready for search`,
        );
      }
    }
    wasIndexingRef.current = active;
  }, [status, lang]);

  if (!token || !status) return null;

  const { indexing, indexedChunks } = status;
  const active = isIndexingActive(status);
  const failed = indexing.status === 'failed';

  if (variant === 'banner' && !active && !failed) return null;
  if (variant === 'panel' && !active && !failed && indexedChunks === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border-subtle bg-surface-primary/40 px-3 py-2 text-xs text-text-secondary',
          className,
        )}
        data-testid="rag-index-idle"
      >
        {lang === 'el'
          ? 'Ξ”ΞµΞ½ Ο…Ο€Ξ¬ΟΟ‡ΞΏΟ…Ξ½ Ξ±ΞΊΟΞΌΞ± ΞµΟ…ΟΞµΟ„Ξ·ΟΞΉΞ±ΟƒΞΌΞ­Ξ½Ξ± chunks β€” ΟƒΟ…Ξ³Ο‡ΟΟΞ½ΞΉΟƒΞµ Ο„Ξ· Ξ²ΞΉΞ²Ξ»ΞΉΞΏΞΈΞ®ΞΊΞ· ΟƒΞΏΟ… Ξ³ΞΉΞ± Ξ±Ξ½Ξ±Ξ¶Ξ®Ο„Ξ·ΟƒΞ· ΟƒΞµ ΟΞ»ΞµΟ‚ Ο„ΞΉΟ‚ ΟƒΟ…ΟƒΞΊΞµΟ…Ξ­Ο‚.'
          : 'No RAG chunks indexed yet β€” sync your library to search across devices.'}
      </div>
    );
  }

  if (variant === 'panel' && !active && !failed) {
    return (
      <div
        className={cn(
          'rounded-xl border border-accent-teal/30 bg-accent-teal/5 px-3 py-2 text-xs',
          className,
        )}
        data-testid="rag-index-ready"
      >
        <span className="inline-flex items-center gap-1.5 text-accent-teal font-medium">
          <Database className="w-3.5 h-3.5" />
          {lang === 'el'
            ? `${indexedChunks} chunks Ξ­Ο„ΞΏΞΉΞΌΞ± Ξ³ΞΉΞ± Ξ±Ξ½Ξ±Ξ¶Ξ®Ο„Ξ·ΟƒΞ·`
            : `${indexedChunks} chunks ready for search`}
        </span>
      </div>
    );
  }

  const label =
    indexing.status === 'queued'
      ? lang === 'el'
        ? 'Ξ£ΞµΞΉΟΞ¬ Ξ±Ξ½Ξ±ΞΌΞΏΞ½Ξ®Ο‚ ΞµΟ…ΟΞµΟ„Ξ·ΟΞ―ΞΏΟ…β€¦'
        : 'RAG index queuedβ€¦'
      : failed
        ? lang === 'el'
          ? 'Ξ‘Ο€ΞΏΟ„Ο…Ο‡Ξ―Ξ± ΞµΟ…ΟΞµΟ„Ξ·ΟΞ―ΞΏΟ…'
          : 'RAG indexing failed'
        : lang === 'el'
          ? 'Ξ•Ο…ΟΞµΟ„Ξ·ΟΞ―Ξ±ΟƒΞ· Ξ²ΞΉΞ²Ξ»ΞΉΞΏΞΈΞ®ΞΊΞ·Ο‚β€¦'
          : 'Indexing library for searchβ€¦';

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2',
        failed
          ? 'border-accent-rose/30 bg-accent-rose/5'
          : 'border-accent-teal/30 bg-accent-teal/5',
        consoleStrip && variant === 'banner' && 'pipeline-console-strip',
        className,
      )}
      data-testid="rag-index-progress"
      data-console={consoleStrip && variant === 'banner' ? 'true' : undefined}
      role="status"
    >
      <div className={cn(
        'flex items-center gap-2 text-xs font-medium text-text-primary',
        consoleStrip && variant === 'banner' ? 'mb-1' : 'mb-1.5',
      )}>
        {failed ? (
          <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-accent-teal animate-spin shrink-0" />
        )}
        <span>{label}</span>
        {!failed && (
          <span className="ml-auto font-mono type-micro text-text-secondary">
            {indexing.progress}%
          </span>
        )}
      </div>
      {!failed && (
        <div className={cn(
          'rounded-full bg-surface-secondary overflow-hidden',
          consoleStrip && variant === 'banner' ? 'h-1' : 'h-1.5',
        )}>
          <div
            className="h-full rounded-full bg-accent-teal transition-all duration-500"
            style={{ width: `${Math.max(4, indexing.progress)}%` }}
          />
        </div>
      )}
      {!failed && indexing.targetChunks > 0 && (
        <p className="mt-1 type-micro text-text-secondary font-mono">
          {lang === 'el'
            ? `${indexing.embedded + indexing.reused} / ${indexing.targetChunks} chunks`
            : `${indexing.embedded + indexing.reused} / ${indexing.targetChunks} chunks`}
        </p>
      )}
      {failed && indexing.error && (
        <p className="type-micro text-accent-rose mt-1 font-mono">{indexing.error}</p>
      )}
    </div>
  );
}
