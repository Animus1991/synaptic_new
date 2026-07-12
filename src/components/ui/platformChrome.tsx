import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { UserSettings } from '../../types';
import { t, type Lang } from '../../lib/i18n';
import { getAgentContent } from '../../lib/agentContent';
import { BLUEPRINT_MOTION, useBlueprintTheme } from '../../lib/useBlueprintTheme';

export { BlueprintSurface } from './BlueprintSurface';

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
  const isBlueprint = useBlueprintTheme();
  const body = (
    <div className={cn('ux-section-header space-y-2', className)}>
      {eyebrow ? <p className="ux-section-eyebrow">{eyebrow}</p> : null}
      <h2 className="font-semibold tracking-tight text-text-primary">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-6 text-text-secondary">{subtitle}</p> : null}
    </div>
  );
  if (!animate) return body;
  const motionProps = isBlueprint
    ? { ...BLUEPRINT_MOTION, transition: { ...BLUEPRINT_MOTION.transition, delay: 0 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };
  return (
    <motion.div {...motionProps}>
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
export function HeroGlow({
  children,
  className,
  /** When true, skip decorative orbs and top dead-space (hero band pages). */
  flush,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div className={cn('platform-hero-glow', flush && 'platform-hero-glow-flush', className)}>
      {!flush && <div className="platform-hero-glow-orbs" aria-hidden />}
      {children}
    </div>
  );
}

export type DescriptiveTabItem<T extends string = string> = {
  id: T;
  label: string;
  summary: string;
  count?: number;
};

/** Option-B sticky section tabs — title + summary per tab (progressive disclosure). */
export function DescriptiveStickyTabBar<T extends string>({
  items,
  activeId,
  onChange,
  className,
  testIdPrefix = 'descriptive-tab',
}: {
  items: DescriptiveTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  testIdPrefix?: string;
}) {
  return (
    <div
      className={cn('descriptive-sticky-tabs', className)}
      role="tablist"
      aria-label="Section tabs"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`${testIdPrefix}-${item.id}`}
            onClick={() => onChange(item.id)}
            className={cn('descriptive-sticky-tab', active && 'descriptive-sticky-tab-active')}
          >
            <span className="descriptive-sticky-tab-label">{item.label}</span>
            <span className="descriptive-sticky-tab-summary">{item.summary}</span>
            {item.count != null && item.count > 0 && (
              <span className="descriptive-sticky-tab-count" aria-hidden>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Nested topic / prerequisite rhythm — Option-B Library InfoStack.
 *  When onItemClick / onSecondaryClick are provided, entries render as
 *  keyboard-accessible buttons that deep-link into the owning surface. */
export function InfoStack({
  title,
  items,
  secondary,
  secondaryLabel,
  className,
  onItemClick,
  onSecondaryClick,
  itemHint,
  secondaryHint,
}: {
  title: string;
  items: string[];
  secondary: string[];
  secondaryLabel: string;
  className?: string;
  onItemClick?: (item: string) => void;
  onSecondaryClick?: (item: string) => void;
  itemHint?: string;
  secondaryHint?: string;
}) {
  if (items.length === 0 && secondary.length === 0) return null;
  return (
    <div className={cn('info-stack', className)}>
      <div className="info-stack-title">{title}</div>
      {items.length > 0 && (
        <div className="info-stack-items">
          {items.map((item) =>
            onItemClick ? (
              <button
                key={item}
                type="button"
                onClick={() => onItemClick(item)}
                title={itemHint}
                className="info-stack-item info-stack-item--interactive"
              >
                {item}
              </button>
            ) : (
              <div key={item} className="info-stack-item">
                {item}
              </div>
            ),
          )}
        </div>
      )}
      {secondary.length > 0 && (
        <div className="info-stack-secondary">
          <p className="info-stack-secondary-eyebrow">{secondaryLabel}</p>
          <div className="info-stack-pills">
            {secondary.map((item) =>
              onSecondaryClick ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSecondaryClick(item)}
                  title={secondaryHint}
                  className="info-stack-pill info-stack-pill--interactive"
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="info-stack-pill">
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Option-B three-bar brand glyph — cyan / violet / emerald. */
export function SynapseBrandGlyph({ className }: { className?: string }) {
  return (
    <div className={cn('synapse-brand-glyph', className)} aria-hidden>
      <span className="synapse-brand-glyph-bar synapse-brand-glyph-bar-cyan" />
      <span className="synapse-brand-glyph-bar synapse-brand-glyph-bar-violet" />
      <span className="synapse-brand-glyph-bar synapse-brand-glyph-bar-emerald" />
    </div>
  );
}

/** Shell header trust pills — Source grounded, PWA, offline reviews (Option-B). */
export function HeaderTrustBadgeRow({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <div
      className={cn('header-trust-badges flex flex-wrap items-center gap-2', className)}
      data-testid="header-trust-badges"
    >
      <span className="ux-trust-badge ux-trust-badge-grounded">{t('shellTrustBadgeSource', lang)}</span>
      <span className="ux-trust-badge ux-trust-badge-pwa">{t('shellTrustBadgePwa', lang)}</span>
      <span className="ux-trust-badge ux-trust-badge-offline">{t('shellTrustBadgeOffline', lang)}</span>
    </div>
  );
}

/** Compact paired alert — Option-B amber / violet MiniAlert. */
export function MiniAlert({
  title,
  body,
  tone,
  className,
}: {
  title: string;
  body: string;
  tone: 'amber' | 'violet';
  className?: string;
}) {
  return (
    <div className={cn('mini-alert', tone === 'amber' ? 'mini-alert-amber' : 'mini-alert-violet', className)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6">{body}</div>
    </div>
  );
}

/** Compact EN/ΕΛ toggle for shell header — Option-B segmented pill. */
export function HeaderLangPill({
  lang,
  onChange,
  className,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('platform-lang-pill', className)}
      role="group"
      aria-label="Language"
      data-testid="header-lang-pill"
    >
      <button
        type="button"
        className={cn('platform-lang-pill-btn', lang === 'en' && 'platform-lang-pill-btn-active')}
        aria-pressed={lang === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={cn('platform-lang-pill-btn', lang === 'el' && 'platform-lang-pill-btn-active')}
        aria-pressed={lang === 'el'}
        onClick={() => onChange('el')}
      >
        ΕΛ
      </button>
    </div>
  );
}
