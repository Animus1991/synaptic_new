import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, MapPin } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import {
  buildAgentContextBanner,
  serializeAgentWorkspaceContextJson,
  type AgentWorkspaceContext,
} from '../features/agent';
import { useI18n } from '../lib/i18n';
import { InfoHint } from './ui/InfoHint';

type Props = {
  context: AgentWorkspaceContext | null | undefined;
  lang: 'en' | 'el';
  className?: string;
  /** Single-line breadcrumb; details via InfoHint (embedded chat). */
  compact?: boolean;
};

/** Visible workspace handoff strip in the Agent panel (Prompt 3 · Wave E13). */
export function AgentContextBanner({ context, lang, className, compact = false }: Props) {
  const { t } = useI18n();
  const banner = buildAgentContextBanner(context, lang);
  const [jsonOpen, setJsonOpen] = useState(false);
  if (!banner) return null;

  const jsonText = serializeAgentWorkspaceContextJson(context);
  const detailParts = [banner.line, banner.caution, banner.groundingNote].filter(Boolean) as string[];

  if (compact) {
    return (
      <div
        className={cn(
          'relative flex items-center gap-2 border-b border-border-subtle px-3 py-1.5 shrink-0 bg-surface-secondary/25',
          className,
        )}
        data-testid="agent-context-banner"
        role="status"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="type-caption text-text-muted leading-none mb-0.5">{banner.heading}</p>
          <p
            className="truncate type-caption font-medium text-text-primary"
            data-testid="agent-context-compact-chip"
            title={banner.line}
          >
            {banner.compactLine}
          </p>
        </div>
        {banner.caution && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-amber" aria-hidden />
        )}
        <InfoHint
          label={detailParts.join('\n\n')}
          triggerAriaLabel={t('agentContextDetailHint')}
          data-testid="agent-context-detail-hint"
          maxWidth={300}
        />
        {jsonText && (
          <button
            type="button"
            onClick={() => setJsonOpen((v) => !v)}
            className="shrink-0 rounded-md px-1.5 py-1 type-caption text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors min-h-9"
            aria-expanded={jsonOpen}
            aria-label={t('agentJsonContext')}
            data-testid="agent-context-json-toggle"
          >
            {jsonOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        {jsonOpen && jsonText && (
          <pre
            className="absolute left-3 right-3 top-full z-40 mt-1 max-h-32 overflow-auto rounded-lg border border-border-subtle bg-surface-card p-2 font-mono type-caption leading-relaxed text-text-secondary shadow-lg"
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
        'border-b border-border-subtle bg-surface-secondary/40 px-4 sm:px-6 py-2.5',
        className,
      )}
      data-testid="agent-context-banner"
      role="status"
    >
      <div className="flex items-start gap-2 max-w-none w-full min-w-0">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="type-caption font-medium text-text-primary">
            <span className="text-text-muted">{banner.heading}</span>
            {' · '}
            {banner.line}
          </p>
          {banner.caution && (
            <p className="flex items-start gap-1 type-caption text-accent-amber">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {banner.caution}
            </p>
          )}
          {banner.groundingNote && (
            <p className="type-caption text-text-secondary">{banner.groundingNote}</p>
          )}
          {jsonText && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setJsonOpen((v) => !v)}
                className="inline-flex items-center gap-1 type-caption font-medium text-text-secondary hover:text-text-primary min-h-9"
                data-testid="agent-context-json-toggle"
                aria-expanded={jsonOpen}
              >
                {jsonOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {t('agentJsonContext')}
              </button>
              {jsonOpen && (
                <pre
                  className="mt-1 max-h-40 overflow-auto rounded-lg border border-border-subtle bg-surface-input/80 p-2 font-mono type-caption leading-relaxed text-text-secondary"
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
