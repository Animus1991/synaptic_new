import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { UserSettings } from '../../types';
import type { Lang } from '../../lib/i18n';
import { getAgentContent } from '../../lib/agentContent';

/** In-page section chrome — Option-B eyebrow / title / subtitle (distinct from PageHeader). */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  animate = true,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const body = (
    <div className={cn('ux-section-header space-y-2', className)}>
      {eyebrow ? <p className="ux-section-eyebrow">{eyebrow}</p> : null}
      <h2 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-6 text-text-secondary">{subtitle}</p> : null}
    </div>
  );
  if (!animate) return body;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {body}
    </motion.div>
  );
}

export type UxCalloutVariant = 'trust' | 'danger' | 'next-action' | 'info' | 'warn';

const CALLOUT_CLASS: Record<UxCalloutVariant, string> = {
  trust: 'ux-callout-trust',
  danger: 'ux-callout-danger',
  'next-action': 'ux-callout-next',
  info: 'ux-callout-info',
  warn: 'ux-callout-warn',
};

/** Semantic alert / callout — danger zone, next best action, trust notes. */
export function UxCallout({
  variant,
  title,
  children,
  icon,
  action,
  className,
  testId,
}: {
  variant: UxCalloutVariant;
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn('ux-callout', CALLOUT_CLASS[variant], className)}
      data-testid={testId}
      role="status"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon ? <span className="mt-0.5 shrink-0 [&>svg]:h-5 [&>svg]:w-5" aria-hidden>{icon}</span> : null}
        <div className="min-w-0">
          {title ? <p className="ux-callout-title">{title}</p> : null}
          <div className="text-sm leading-6">{children}</div>
        </div>
      </div>
      {action ? <div className="shrink-0 self-center sm:self-start">{action}</div> : null}
    </div>
  );
}

/** Source-trust pill row — mirrors Option-B source viewer badges. */
export function TrustBadgeRow({
  sourceMode,
  lang,
  className,
}: {
  sourceMode: UserSettings['sourceMode'];
  lang: Lang;
  className?: string;
}) {
  const { ui, sourceModes } = getAgentContent(lang);
  const active = sourceModes.find((m) => m.id === sourceMode);

  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-testid="trust-badge-row">
      <span className="ux-trust-badge ux-trust-badge-grounded">{ui.badgeSourceGrounded}</span>
      {(sourceMode === 'strict' || sourceMode === 'notes-only') && (
        <span className="ux-trust-badge">{active?.label ?? ui.sourceOn}</span>
      )}
      {sourceMode === 'enriched' && (
        <span className="ux-trust-badge ux-trust-badge-enrichment">{ui.badgeEnrichment}</span>
      )}
    </div>
  );
}

/** Session launcher card — Option-B left-aligned duration tag + detail. */
export function SessionLauncherCard({
  label,
  desc,
  durationTag,
  taskHint,
  icon: Icon,
  active,
  disabled,
  onClick,
  testId,
}: {
  label: string;
  desc: string;
  durationTag: string;
  taskHint?: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'ux-session-card',
        active && 'ux-session-card-active',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className="ux-session-card-icon">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.22em] text-text-muted">{durationTag}</span>
        <span className="mt-1.5 block text-xs leading-5 text-text-secondary">{desc}</span>
        {taskHint ? (
          <span className="mt-1 block text-[10px] text-text-tertiary">{taskHint}</span>
        ) : null}
      </span>
    </button>
  );
}

/** Subtle hero radial glow — Dashboard / Tasks page headers. */
export function HeroGlow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('platform-hero-glow', className)}>
      <div className="platform-hero-glow-orbs" aria-hidden />
      {children}
    </div>
  );
}
