import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Placement = 'top' | 'bottom';

type Props = {
  /**
   * Already-translated hint text. Callers MUST localize with the t() helper,
   * e.g. <InfoHint label={t('Ελληνικά', 'English')} triggerAriaLabel={...} />.
   */
  label: ReactNode;
  /** Accessible name for the trigger button (localized). */
  triggerAriaLabel: string;
  /** Optional custom trigger content; defaults to a small help icon. */
  children?: ReactNode;
  className?: string;
  /** Max width of the bubble in px. */
  maxWidth?: number;
  'data-testid'?: string;
};

/**
 * Accessible, mobile-friendly explanatory hint.
 *
 * Why this exists: the workspace previously relied on the native `title`
 * attribute, which appears after a long delay, is invisible on touch devices,
 * and cannot be styled — so controls stayed cryptic. InfoHint opens instantly on
 * hover, keyboard focus, and tap; closes on Escape / outside tap / scroll; and
 * renders through a portal so it is never clipped by `overflow-hidden` panels.
 */
export function InfoHint({
  label,
  triggerAriaLabel,
  children,
  className,
  maxWidth = 260,
  'data-testid': testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: Placement } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  const place = () => {
    const el = triggerRef.current;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const placement: Placement = spaceBelow < 140 ? 'top' : 'bottom';
    const left = Math.min(Math.max(8, r.left + r.width / 2), window.innerWidth - 8);
    const top = placement === 'bottom' ? r.bottom + 8 : r.top - 8;
    setCoords({ top, left, placement });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerAriaLabel}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        data-testid={testId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          // Open-only: on touch, the tap already fired mouseenter/focus (open),
          // so a toggle here would close the hint before it is ever seen.
          // Dismissal is handled by mouseleave / blur / Escape / outside tap.
          setOpen(true);
        }}
        className={cn(
          'inline-flex h-6 w-6 min-h-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors hover:text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          className,
        )}
      >
        {children ?? <HelpCircle className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {open && coords && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={bubbleRef}
              id={id}
              role="tooltip"
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform:
                  coords.placement === 'bottom'
                    ? 'translate(-50%, 0)'
                    : 'translate(-50%, -100%)',
                maxWidth,
                zIndex: 1000,
              }}
              className="pointer-events-none rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 type-caption leading-snug text-text-secondary shadow-lg"
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
