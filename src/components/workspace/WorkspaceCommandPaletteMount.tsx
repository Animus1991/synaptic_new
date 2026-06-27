import { useEffect, useState, type ComponentProps } from 'react';
import { CommandPalette } from './CommandPalette';

type Props = ComponentProps<typeof CommandPalette>;

/**
 * B9 — Defer CommandPalette mount until idle; mount immediately when opened.
 */
export function WorkspaceCommandPaletteMount({ open, ...rest }: Props) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (mounted) return;
    if (typeof window === 'undefined') return;
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(() => setMounted(true), { timeout: 1800 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMounted(true), 400);
    return () => window.clearTimeout(t);
  }, [mounted]);

  if (!mounted) return null;
  return <CommandPalette open={open} {...rest} />;
}
