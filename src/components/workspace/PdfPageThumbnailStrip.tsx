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

  /* OPT-K137 — self-explanatory page chips (Page N), not bare numbers */
  const pagesLabel = lang === 'el' ? 'Μετάβαση σε σελίδα PDF' : 'Jump to a PDF page';
  const pageChip = (n: number) => (lang === 'el' ? `Σελ. ${n}` : `Page ${n}`);

  return (
    <div
      className={cn('flex gap-1.5 overflow-x-auto pb-1', className)}
      role="listbox"
      aria-label={pagesLabel}
      data-testid="pdf-page-thumbnail-strip"
    >
      {thumbs.map((thumb) => {
        const selected = thumb.pageIndex === activePageIndex;
        const n = thumb.pageIndex + 1;
        return (
          <button
            key={thumb.pageIndex}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={pageChip(n)}
            title={pageChip(n)}
            data-testid={`pdf-page-thumb-${thumb.pageIndex}`}
            className={cn(
              /* OPT-N1 / OPT-K126 / OPT-K137 — wash page chips; label reads as a page jump */
              'shrink-0 min-h-11 min-w-[2.75rem] rounded-lg border-0 overflow-hidden bg-surface-secondary/55 px-1.5',
              selected
                ? 'brightness-100 shadow-[inset_0_-2px_0_0_color-mix(in_srgb,var(--color-text-primary)_42%,transparent)]'
                : 'brightness-90',
              onSelectPage && 'cursor-pointer hover:brightness-100 hover:bg-surface-hover',
            )}
            onClick={() => onSelectPage?.(thumb.pageIndex)}
          >
            {thumb.url ? (
              <span className="relative flex h-14 w-11 flex-col">
                <img src={thumb.url} alt="" className="h-full w-full object-cover object-top" />
                <span className="absolute inset-x-0 bottom-0 bg-surface-card/90 type-micro font-medium text-text-secondary text-center leading-tight py-0.5">
                  {pageChip(n)}
                </span>
              </span>
            ) : (
              <span className="flex h-full min-h-11 w-full flex-col items-center justify-center type-caption font-medium text-text-secondary leading-tight">
                {thumb.loading && pdfBytes ? '…' : pageChip(n)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
