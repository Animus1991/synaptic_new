import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type OverflowChipItem = {
  key: string;
  label: string;
  title?: string;
  onClick?: () => void;
};

type Props = {
  items: OverflowChipItem[];
  /** Visible chips before +N (default 2). */
  maxVisible?: number;
  className?: string;
  chipClassName?: string;
  moreClassName?: string;
  testId?: string;
  moreTestId?: string;
  moreAriaLabel?: (hiddenCount: number) => string;
  lessAriaLabel?: string;
  /** Optional trailing control (e.g. “+ File”) always after chips. */
  trailing?: ReactNode;
};

/**
 * OPT-K14 — densify chip walls: show a short row + “+N”, expand to reach every tag.
 * Zero feature removal: overflow never drops items.
 */
export function OverflowChipRow({
  items,
  maxVisible = 2,
  className,
  chipClassName,
  moreClassName,
  testId,
  moreTestId,
  moreAriaLabel,
  lessAriaLabel = 'Show fewer tags',
  trailing,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hiddenCount = Math.max(0, items.length - maxVisible);
  const visible = expanded || hiddenCount === 0 ? items : items.slice(0, maxVisible);

  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  if (items.length === 0 && !trailing) return null;

  return (
    <div
      ref={rootRef}
      className={cn('overflow-chip-row flex flex-wrap items-center gap-1.5', className)}
      data-testid={testId}
      data-overflow-expanded={expanded ? 'true' : 'false'}
    >
      {visible.map((item) => {
        const shared = cn(
          'overflow-chip max-w-[7.5rem] truncate rounded-md border border-border-subtle bg-surface-secondary/50 px-1.5 py-0.5 text-[10px] text-text-secondary',
          chipClassName,
        );
        if (item.onClick) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
              }}
              title={item.title ?? item.label}
              className={cn(shared, 'hover:border-border-default hover:text-text-primary transition-colors')}
            >
              {item.label}
            </button>
          );
        }
        return (
          <span key={item.key} className={shared} title={item.title ?? item.label}>
            {item.label}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          data-testid={moreTestId ?? (testId ? `${testId}-more` : 'overflow-chip-more')}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={
            expanded
              ? lessAriaLabel
              : (moreAriaLabel?.(hiddenCount) ?? `Show ${hiddenCount} more tags`)
          }
          title={expanded ? lessAriaLabel : `+${hiddenCount}`}
          className={cn(
            'overflow-chip-more rounded-md border border-border-subtle bg-transparent px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:border-border-default hover:text-text-primary transition-colors',
            moreClassName,
          )}
        >
          {expanded ? '−' : `+${hiddenCount}`}
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <span id={panelId} className="sr-only">
          {items.slice(maxVisible).map((i) => i.label).join(', ')}
        </span>
      )}
      {trailing}
    </div>
  );
}
