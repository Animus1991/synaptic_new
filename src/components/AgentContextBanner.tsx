import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, HelpCircle, MapPin } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import {
  buildAgentContextBanner,
  serializeAgentWorkspaceContextJson,
  type AgentContextBannerView,
  type AgentWorkspaceContext,
} from '../lib/agentWorkspaceContext';
import { useI18n } from '../lib/i18n';

type Props = {
  context: AgentWorkspaceContext | null | undefined;
  lang: 'en' | 'el';
  className?: string;
  /** Single-line chip; full context on hover/focus popover (embedded chat). */
  compact?: boolean;
};

function buildTooltipText(banner: AgentContextBannerView, jsonText: string | null): string {
  const parts = [`${banner.heading} ${banner.line}`];
  if (banner.caution) parts.push(banner.caution);
  if (banner.groundingNote) parts.push(banner.groundingNote);
  if (jsonText) parts.push(jsonText);
  return parts.join('\n\n');
}

/** Visible workspace handoff strip in the Agent panel (Prompt 3). */
export function AgentContextBanner({ context, lang, className, compact = false }: Props) {
  const { t } = useI18n();
  const banner = buildAgentContextBanner(context, lang);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  if (!banner) return null;

  const jsonText = serializeAgentWorkspaceContextJson(context);
  const tooltip = buildTooltipText(banner, jsonText);

  if (compact) {
    return (
      <div
        className={cn(
          'relative flex items-center gap-2 border-b border-border-subtle/60 px-3 py-1 shrink-0 bg-surface-secondary/15',
          className,
        )}
        data-testid="agent-context-banner"
        role="status"
      >
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            className="flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-surface-hover transition-colors"
            title={tooltip}
            aria-label={tooltip}
            data-testid="agent-context-compact-chip"
            onMouseEnter={() => setPopoverOpen(true)}
            onMouseLeave={() => setPopoverOpen(false)}
            onFocus={() => setPopoverOpen(true)}
            onBlur={() => setPopoverOpen(false)}
          >
            <MapPin className="h-3 w-3 shrink-0 text-brand-600" aria-hidden />
            <span className="truncate text-[10px] font-medium text-text-secondary">
              <span className="text-text-muted">{banner.heading}</span>{' '}
              {banner.line}
            </span>
            {banner.caution && (
              <AlertTriangle className="h-3 w-3 shrink-0 text-accent-amber" aria-hidden />
            )}
          </button>
          {popoverOpen && (
            <div
              className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface-card p-3 shadow-lg text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap"
              data-testid="agent-context-popover"
            >
              <p className="font-medium text-text-primary">{banner.line}</p>
              {banner.caution && (
                <p className="mt-1.5 text-accent-amber">{banner.caution}</p>
              )}
              {banner.groundingNote && (
                <p className="mt-1.5 text-text-muted">{banner.groundingNote}</p>
              )}
              {jsonText && (
                <pre className="mt-2 max-h-28 overflow-auto rounded-lg border border-border-subtle bg-surface-input/80 p-2 font-mono text-[9px]">
                  {jsonText}
                </pre>
              )}
            </div>
          )}
        </div>
        {jsonText && (
          <button
            type="button"
            onClick={() => setJsonOpen((v) => !v)}
            className="shrink-0 rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-brand-700 transition-colors"
            aria-expanded={jsonOpen}
            aria-label={t('agentJsonContext')}
            data-testid="agent-context-json-toggle"
            title={t('agentJsonContext')}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {jsonOpen && jsonText && (
          <pre
            className="absolute left-3 right-3 top-full z-40 mt-1 max-h-32 overflow-auto rounded-lg border border-border-subtle bg-surface-card p-2 font-mono text-[9px] leading-relaxed text-text-secondary shadow-lg"
            data-testid="agent-context-json"
          >
            {jsonText}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-b border-brand-500/20 bg-brand-500/5 px-4 sm:px-6 py-2.5',
        className,
      )}
      data-testid="agent-context-banner"
      role="status"
    >
      <div className="flex items-start gap-2 max-w-none w-full min-w-0">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-medium text-text-primary">
            <span className="text-text-muted">{banner.heading}</span>{' '}
            {banner.line}
          </p>
          {banner.caution && (
            <p className="flex items-start gap-1 text-[10px] text-accent-amber">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {banner.caution}
            </p>
          )}
          {banner.groundingNote && (
            <p className="text-[10px] text-text-muted">{banner.groundingNote}</p>
          )}
          {jsonText && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setJsonOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-300 hover:text-brand-200"
                data-testid="agent-context-json-toggle"
                aria-expanded={jsonOpen}
              >
                {jsonOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {t('agentJsonContext')}
              </button>
              {jsonOpen && (
                <pre
                  className="mt-1 max-h-40 overflow-auto rounded-lg border border-border-subtle bg-surface-input/80 p-2 font-mono text-[10px] leading-relaxed text-text-secondary"
                  data-testid="agent-context-json"
                >
                  {jsonText}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
