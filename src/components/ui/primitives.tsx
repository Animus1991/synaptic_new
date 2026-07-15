import { ReactNode, forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import type { LucideIcon } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { BlueprintSurface } from './BlueprintSurface';
import {
  BLUEPRINT_MOTION,
  blueprintStaggerDelay,
  useBlueprintTheme,
} from '../../lib/useBlueprintTheme';

/**
 * Shared page-level layout primitives for Synapse top-level views.
 * Warm Sand bento surfaces + Lora headings (synaptic-refined alignment).
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
  const isBlueprint = useBlueprintTheme();
  const content = (
    <div className={cn('ux-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="ws-eyebrow mb-1.5 text-text-secondary">{eyebrow}</p>}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-600">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h1 className="ws-serif truncate font-medium tracking-tight text-text-primary">{title}</h1>
        </div>
        {subtitle && <div className="ux-page-subtitle mt-1.5 text-text-secondary">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );

  if (!animate) return content;
  const motionProps = isBlueprint
    ? { ...BLUEPRINT_MOTION, transition: { ...BLUEPRINT_MOTION.transition, delay: 0 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
  return (
    <motion.div {...motionProps}>
      {content}
    </motion.div>
  );
}

const CARD_TONE = {
  default: '',
  muted: '',
  brand: 'border-brand-500/25 bg-brand-500/5',
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

/** Bento surface card — Warm Sand editorial panel. */
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
    <BlueprintSurface
      hint={tone === 'muted'}
      className={cn(
        tone !== 'default' && tone !== 'muted' && 'rounded-panel border',
        CARD_TONE[tone],
        CARD_PAD[padding],
        interactive && 'cursor-pointer transition-colors hover:border-brand-500/35',
        className,
      )}
    >
      {children}
    </BlueprintSurface>
  );
}

/**
 * Platform section chrome — mirrors workspace ToolFrame (header + body) for top-level pages.
 */
export function PlatformSection({
  title,
  icon: Icon,
  iconClassName,
  action,
  children,
  tone = 'default',
  padding = 'md',
  className,
  headingSize = 'sm',
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: keyof typeof CARD_TONE;
  padding?: keyof typeof CARD_PAD;
  className?: string;
  headingSize?: 'sm' | 'lg';
}) {
  return (
    <Card tone={tone} padding={padding} className={className}>
      {title && (
        <SectionHeading
          title={title}
          icon={Icon}
          iconClassName={iconClassName}
          action={action}
          size={headingSize}
          className={padding === 'none' ? 'mb-0' : 'mb-4'}
        />
      )}
      {children}
    </Card>
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
          size === 'lg' ? 'ws-serif text-lg font-medium' : 'text-sm',
        )}
      >
        {Icon && <Icon className={cn('shrink-0 text-brand-600', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4', iconClassName)} />}
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
        'inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small KPI tile (streak, XP, reviews due, …). */
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
    <BlueprintSurface className={cn('p-4 ux-stat-tile', className)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="ws-eyebrow text-text-secondary">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-text-primary">{value}</p>
      {hint && <p className="ws-caption mt-0.5 text-text-muted">{hint}</p>}
    </BlueprintSurface>
  );
}

/** Drop-in class bundle for legacy card divs migrating to blueprint glass. */
export const platformBento = 'ux-card blueprint-surface';

export type PlatformTabItem = {
  key: string;
  label: ReactNode;
  icon?: LucideIcon;
  testId?: string;
};

/** Shared platform tab bar — matches Tasks / Analytics / Course affordances. */
export function TabBar({
  tabs,
  activeKey,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: PlatformTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('ux-tab-bar', className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={tab.testId}
            onClick={() => onChange(tab.key)}
            className={cn('ux-tab', active && 'ux-tab-active')}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {Icon ? <span className="hidden sm:inline">{tab.label}</span> : tab.label}
          </button>
        );
      })}
    </div>
  );
}

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof CARD_TONE;
  padding?: keyof typeof CARD_PAD;
  delay?: number;
  animate?: boolean;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

/** Card with standard platform entrance motion. */
export function AnimatedCard({
  children,
  className,
  tone = 'default',
  padding = 'md',
  delay = 0,
  animate = true,
  ...motionProps
}: AnimatedCardProps) {
  const isBlueprint = useBlueprintTheme();
  const card = (
    <Card tone={tone} padding={padding} className={className}>
      {children}
    </Card>
  );
  if (!animate) return card;
  const motionInitial = isBlueprint ? BLUEPRINT_MOTION.initial : { opacity: 0, y: 10 };
  const motionAnimate = isBlueprint ? BLUEPRINT_MOTION.animate : { opacity: 1, y: 0 };
  const motionTransition = isBlueprint
    ? { ...BLUEPRINT_MOTION.transition, delay: blueprintStaggerDelay(undefined, delay) }
    : { delay, duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };
  return (
    <motion.div
      initial={motionInitial}
      animate={motionAnimate}
      transition={motionTransition}
      {...motionProps}
    >
      {card}
    </motion.div>
  );
}

/** Primary call-to-action — solid brand fill, WCAG-friendly white label. */
export const PrimaryCTA = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'sm' | 'md' }
>(function PrimaryCTA({ children, className, size = 'md', ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'ux-primary-cta inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all duration-300',
        'bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:pointer-events-none',
        size === 'sm' ? 'px-4 py-2 text-xs min-h-[2rem]' : 'px-5 text-sm min-h-[var(--btn-height)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/** Secondary call-to-action — bordered pill for non-destructive alternate actions. */
export const SecondaryCTA = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'sm' | 'md' }
>(function SecondaryCTA({ children, className, size = 'md', ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'ux-secondary-cta inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 platform-pill',
        'border border-border-subtle text-text-secondary hover:border-brand-500/35 hover:text-brand-700',
        'disabled:opacity-60 disabled:pointer-events-none',
        size === 'sm' ? 'px-3 py-2 text-xs min-h-[2rem]' : 'px-4 text-sm min-h-[var(--btn-height)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
