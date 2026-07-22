/**
 * SRC-08 — horizontal multi-page PDF thumbnail strip for the cognitive reader.
 */
import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { renderPdfPageThumbnail, type PdfCoverThumbnail } from '../../lib/pdfThumbnail';
import { renderPdfCoverFromBytes } from '../../lib/pdfThumbnailWorkerClient';

export const MAX_PAGE_STRIP_THUMBS = 12;

type Props = {
  /** Raw PDF bytes (ArrayBuffer or Uint8Array). */
  pdfBytes?: ArrayBuffer | Uint8Array | null;
  pageCount?: number;
  activePageIndex?: number;
  onSelectPage?: (pageIndex: number) => void;
  className?: string;
  lang?: 'en' | 'el';
};

type ThumbState = {
  pageIndex: number;
  url: string | null;
  loading: boolean;
  error?: string;
};

export function PdfPageThumbnailStrip({
  pdfBytes,
  pageCount = 1,
  activePageIndex = 0,
  onSelectPage,
  className,
  lang = 'en',
}: Props) {
  const count = Math.min(Math.max(1, pageCount), MAX_PAGE_STRIP_THUMBS);
  const [thumbs, setThumbs] = useState<ThumbState[]>(() =>
    Array.from({ length: count }, (_, i) => ({ pageIndex: i, url: null, loading: true })),
  );

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    async function run() {
      if (!pdfBytes) {
        setThumbs(Array.from({ length: count }, (_, i) => ({
          pageIndex: i,
          url: null,
          loading: false,
          error: 'no-pdf',
        })));
        return;
      }
      const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
      const next: ThumbState[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const cover: PdfCoverThumbnail =
            i === 0
              ? await renderPdfCoverFromBytes(bytes, { pageCount: count }, { pageIndex: 0, maxEdgePx: 96 })
              : await renderPdfPageThumbnail(bytes, { pageIndex: i, maxEdgePx: 96 });
          if (cancelled) return;
          const url = URL.createObjectURL(cover.blob);
          urls.push(url);
          next.push({ pageIndex: i, url, loading: false });
        } catch (e) {
          next.push({
            pageIndex: i,
            url: null,
            loading: false,
            error: e instanceof Error ? e.message : 'render failed',
          });
        }
        if (!cancelled) setThumbs([...next, ...Array.from({ length: count - next.length }, (_, j) => ({
          pageIndex: next.length + j,
          url: null,
          loading: true,
        }))]);
      }
      if (!cancelled) setThumbs(next);
    }

    void run();
    return () => {
      cancelled = true;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [pdfBytes, count]);

  if (count <= 1) return null;

  return (
    <div
      className={cn('flex gap-1.5 overflow-x-auto pb-1', className)}
      role="listbox"
      aria-label={lang === 'el' ? 'Σελίδες PDF' : 'PDF pages'}
      data-testid="pdf-page-thumbnail-strip"
    >
      {thumbs.map((t) => {
        const selected = t.pageIndex === activePageIndex;
        return (
          <button
            key={t.pageIndex}
            type="button"
            role="option"
            aria-selected={selected}
            data-testid={`pdf-page-thumb-${t.pageIndex}`}
            className={cn(
              'shrink-0 h-14 w-11 rounded-md border overflow-hidden bg-surface-secondary',
              selected ? 'border-accent-cyan ring-1 ring-accent-cyan/40' : 'border-border-subtle/60',
            )}
            onClick={() => onSelectPage?.(t.pageIndex)}
          >
            {t.url ? (
              <img src={t.url} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
                {t.loading && pdfBytes ? '…' : t.pageIndex + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
