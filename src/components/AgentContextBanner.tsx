import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import {
  buildAgentContextBanner,
  serializeAgentWorkspaceContextJson,
  type AgentWorkspaceContext,
} from '../features/agent';
import { useI18n } from '../lib/i18n';
import { InfoHint } from './ui/InfoHint';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';

type Props = {
  context: AgentWorkspaceContext | null | undefined;
  lang: 'en' | 'el';
  className?: string;
  /** Single-line breadcrumb; details via InfoHint (embedded chat). */
  compact?: boolean;
  /** OPT-K138 — merge offline / session notice into the same strip (no second banner). */
  sessionNotice?: string | null;
};

/**
 * Visible workspace handoff strip in the Agent panel (Prompt 3 · Wave E13 / AG).
 * OPT-K136/K152 — icon diet. OPT-K138 — merge offline into same strip.
 */
export function AgentContextBanner({
  context,
  lang,
  className,
  compact = false,
  sessionNotice = null,
}: Props) {
  const { t } = useI18n();
  const banner = buildAgentContextBanner(context, lang);
  const [jsonOpen, setJsonOpen] = useState(false);
  if (!banner && !sessionNotice) return null;

  const jsonText = serializeAgentWorkspaceContextJson(context);
  const detailParts = [
    sessionNotice,
    banner?.line,
    banner?.caution,
    banner?.groundingNote,
  ].filter(Boolean) as string[];

  if (compact) {
    const primaryLine = sessionNotice
      ?? banner?.compactLine
      ?? banner?.line
      ?? '';
    const showWarn = Boolean(sessionNotice || banner?.caution);

    return (
      <div
        className={cn(
          /* OPT-K138 — one compact status strip (study + offline + details) */
          'relative flex items-center gap-2 border-b border-transparent px-3 py-1.5 shrink-0',
          sessionNotice ? 'platform-banner-warn' : 'bg-surface-secondary/25',
          className,
        )}
        data-testid={banner ? 'agent-context-banner' : 'agent-session-offline-strip'}
        data-context-banner={banner ? 'true' : undefined}
        data-session-notice={sessionNotice ? 'true' : undefined}
        role="status"
      >
        {sessionNotice && banner && (
          <span className="sr-only" data-testid="agent-session-offline-strip">
            {sessionNotice}
          </span>
        )}
        {/* OPT-K152 — text-first offline strip (skip decorative triangle when notice is present) */}
        {showWarn && !sessionNotice && (
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0 text-accent-amber"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          {banner && !sessionNotice && (
            <p className="type-caption text-text-muted leading-none mb-0.5">{banner.heading}</p>
          )}
          <p
            className={cn(
              'truncate type-caption font-medium',
              sessionNotice ? 'platform-banner-title text-[var(--color-banner-warn-ink)]' : 'text-text-primary',
            )}
            data-testid="agent-context-compact-chip"
            title={detailParts.join(' · ')}
          >
            {primaryLine}
          </p>
        </div>
        {detailParts.length > 0 && (
          <InfoHint
            label={detailParts.join('\n\n')}
            triggerAriaLabel={t('agentContextDetailHint')}
            data-testid="agent-context-detail-hint"
            maxWidth={300}
          />
        )}
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

  if (!banner) return null;

  return (
    <div
      className={cn(
        'border-b border-transparent bg-surface-secondary/40',
        className,
      )}
      data-testid="agent-context-banner"
      data-bleed="full"
      role="status"
    >
      <div className="flex w-full min-w-0 max-w-none items-start gap-2 px-3 py-2 sm:px-4">
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
          {sessionNotice && (
            <p className="type-caption text-accent-amber" data-testid="agent-session-offline-strip">
              {sessionNotice}
            </p>
          )}
        </div>
      </div>
      {(banner.groundingNote || jsonText) && (
        <CollapsibleChromeSection
          title={t('agentHowAnswersChrome')}
          alwaysCollapse
          data-testid="agent-how-answers-chrome"
        >
          <div className="space-y-1.5 px-3 pb-2 sm:px-4">
            {banner.groundingNote && (
              <p className="type-caption text-text-secondary" data-testid="agent-grounding-note">
                {banner.groundingNote}
              </p>
            )}
            {jsonText && (
              <div>
                <button
                  type="button"
                  onClick={() => setJsonOpen((v) => !v)}
                  className="inline-flex min-h-9 items-center gap-1 type-caption font-medium text-text-secondary hover:text-text-primary"
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
        </CollapsibleChromeSection>
      )}
    </div>
  );
}
