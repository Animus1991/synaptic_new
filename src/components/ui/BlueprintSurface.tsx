import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BlueprintSurfaceProps<T extends ElementType = 'div'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  /** Inner nested glass panel (split lesson / tool wells). */
  nest?: boolean;
  /** Subtle cyan glass on dark theme when blueprint full glass is off. */
  hint?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** Option-B glass panel — full treatment on blueprint theme; safe `ux-card` fallback elsewhere. */
export function BlueprintSurface<T extends ElementType = 'div'>({
  as,
  children,
  className,
  nest = false,
  hint = false,
  ...rest
}: BlueprintSurfaceProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={cn(
        'ux-card blueprint-surface',
        nest && 'blueprint-surface-nest',
        hint && 'blueprint-surface-hint',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
