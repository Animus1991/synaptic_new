import { BookOpen, Sparkles, ArrowRight, Link2 } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { getToolCrossLinkDef } from '../../lib/workspaceToolCrossLinks';
import { buildToolDefaultAgentPrompt } from '../../lib/workspaceToolAgentPrompts';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { useI18n } from '../../lib/i18n';

type Props = {
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  concept?: string;
  stepTitle?: string;
  onJumpTool: (tool: WorkspaceToolId) => void;
  onOpenReader?: () => void;
  onAskAgent?: () => void;
  className?: string;
};

/**
 * Compact mobile-friendly cross-link strip. Renders the connected tools as
 * accessible card-buttons with a clear CTA chevron and proper labelling. On
 * mobile each related tool stacks full-width; on sm+ it switches to wrap-flow.
 */
export function WorkspaceToolCrossLinkBar({
  activeTool,
  lang,
  concept,
  stepTitle,
  onJumpTool,
  onOpenReader,
  onAskAgent,
  className,
}: Props) {
  const { t } = useI18n();
  const def = getToolCrossLinkDef(activeTool);
  const groupLabel = lang === 'el' ? def.groupEl : def.groupEn;
  const purpose = lang === 'el' ? def.purposeEl : def.purposeEn;

  return (
    <section
      className={cn(
        'shrink-0 border-b border-border-subtle/70 bg-surface-secondary/30 px-3 py-2.5 sm:px-4',
        className,
      )}
      data-testid={`workspace-crosslinks-${activeTool}`}
      aria-label={t('crossLinkRelatedAria').replace('{tool}', workspaceToolLabel(activeTool, lang))}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="ws-eyebrow inline-flex items-center gap-1 text-text-muted">
          <Link2 className="h-3 w-3" aria-hidden />
          {groupLabel}
        </span>
        {stepTitle && (
          <span
            className="hidden sm:inline truncate text-[10px] text-text-muted max-w-[220px]"
            title={stepTitle}
          >
            · {concept?.slice(0, 32) || stepTitle.slice(0, 32)}
          </span>
        )}
        <span className="flex-1" />
        {def.readerAnchor && onOpenReader && activeTool !== 'reader' && (
          <button
            type="button"
            data-testid="crosslink-open-reader"
            onClick={onOpenReader}
            aria-label={t('crossLinkOpenSourceAria')}
            className="ws-eyebrow inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card/80 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-400/40 hover:text-brand-800 transition-colors min-h-[32px]"
          >
            <BookOpen className="h-3 w-3" aria-hidden />
            {t('toolSource')}
          </button>
        )}
        {onAskAgent && (
          <button
            type="button"
            data-testid="crosslink-ask-agent"
            onClick={onAskAgent}
            aria-label={t('askAgentShort')}
            className="ws-eyebrow inline-flex items-center gap-1 rounded-md border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] text-brand-800 hover:opacity-90 transition-colors min-h-[32px]"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Agent
          </button>
        )}
      </div>

      {/* Purpose hint */}
      <p
        className="mt-1 line-clamp-1 text-[10px] text-text-muted sm:line-clamp-1"
        title={purpose}
      >
        {purpose}
      </p>

      {/* Related-tool cards: stacked on mobile, wrap-row on sm+ */}
      {def.related.length > 0 && (
        <ul
          className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap"
          role="list"
          data-testid="crosslink-related-list"
        >
          {def.related.map((link) => (
            <li key={link.tool} className="flex sm:flex-initial">
              <button
                type="button"
                data-testid={`crosslink-jump-${link.tool}`}
                onClick={() => onJumpTool(link.tool)}
                aria-label={t('crossLinkJumpTo').replace('{label}', lang === 'el' ? link.labelEl : link.labelEn)}
                className="group inline-flex w-full sm:w-auto items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-card/80 px-3 py-2 text-[12px] text-text-secondary hover:border-brand-500/40 hover:bg-brand-500/8 hover:text-brand-800 focus-visible:border-brand-400/60 focus-visible:text-brand-200 transition-colors min-h-[40px]"
              >
                <span className="truncate font-medium">
                  {lang === 'el' ? link.labelEl : link.labelEn}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-90" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function crossLinkAgentPrompt(tool: WorkspaceToolId, lang: 'en' | 'el', concept?: string): string {
  return buildToolDefaultAgentPrompt(tool, lang, concept);
}

export { workspaceToolLabel };
