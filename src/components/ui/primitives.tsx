import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Shared page-level layout primitives for Synapse top-level views.
 *
 * These deepen the EXISTING token/design language (surface-*, border-*, text-*,
 * brand-*) έΑΦ they do NOT introduce a new palette or component library. Use them
 * across Dashboard, Library, Tasks, Agent, Analytics, Teacher and Settings so the
 * chrome reads consistently and calmly across the whole app.
 */

/** Outer page wrapper: consistent padding, max width handling and vertical rhythm. */
export function Page({
  children,
  className,
  gap = 'md',
}: {
  children: ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}) {
  const gapClass = gap === 'sm' ? 'space-y-4' : gap === 'lg' ? 'space-y-8' : 'space-y-6';
  return (
    <div className={cn('w-full min-w-0 p-4 pb-24 sm:p-6 lg:px-8 lg:pb-8', gapClass, className)}>
      {children}
    </div>
  );
}

/** Standard page header: optional eyebrow + icon, title, subtitle and trailing actions. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  className,
  animate = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const content = (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="ws-eyebrow mb-1.5 text-text-muted">{eyebrow}</p>}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {subtitle && <p className="mt-1.5 text-sm text-text-secondary sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );

  if (!animate) return content;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {content}
    </motion.div>
  );
}

const CARD_TONE = {
  default: 'border-border-subtle bg-surface-card',
  muted: 'border-border-subtle bg-surface-secondary/40',
  brand: 'border-brand-500/20 bg-brand-500/5',
  amber: 'border-accent-amber/20 bg-accent-amber/5',
  rose: 'border-accent-rose/20 bg-accent-rose/5',
  teal: 'border-accent-teal/25 bg-accent-teal/5',
  orange: 'border-accent-orange/20 bg-accent-orange/5',
} as const;

const CARD_PAD = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

/** Surface card with consistent radius / border / padding and optional tone. */
export function Card({
  children,
  className,
  tone = 'default',
  padding = 'md',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof CARD_TONE;
  padding?: keyof typeof CARD_PAD;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border',
        CARD_TONE[tone],
        CARD_PAD[padding],
        interactive && 'cursor-pointer transition-colors hover:border-border-default',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section heading inside a card or column: icon + title with optional trailing action. */
export function SectionHeading({
  title,
  icon: Icon,
  iconClassName,
  action,
  size = 'sm',
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: ReactNode;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2
        className={cn(
          'flex items-center gap-2 font-semibold text-text-primary',
          size === 'lg' ? 'text-lg' : 'text-sm',
        )}
      >
        {Icon && <Icon className={cn('shrink-0', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4', iconClassName ?? 'text-text-tertiary')} />}
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Compact "view all" style trailing link used in section headers. */
export function CardLink({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small KPI tile (streak, XP, reviews due, έΑο). */
export function StatTile({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-border-subtle bg-surface-card p-4', className)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="ws-caption text-text-tertiary">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="ws-caption mt-0.5 text-text-muted">{hint}</p>}
    </div>
  );
}
