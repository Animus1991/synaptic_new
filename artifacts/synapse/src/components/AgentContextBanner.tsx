import { AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  buildAgentContextBanner,
  type AgentWorkspaceContext,
} from '../lib/agentWorkspaceContext';

type Props = {
  context: AgentWorkspaceContext | null | undefined;
  lang: 'en' | 'el';
  className?: string;
};

/** Visible workspace handoff strip in the Agent panel (Prompt 3). */
export function AgentContextBanner({ context, lang, className }: Props) {
  const banner = buildAgentContextBanner(context, lang);
  if (!banner) return null;

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
        </div>
      </div>
    </div>
  );
}
