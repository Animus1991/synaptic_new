import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { getToolCrossLinkDef } from '../../lib/workspaceToolCrossLinks';
import { buildToolDefaultAgentPrompt } from '../../lib/workspaceToolAgentPrompts';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';

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
  const def = getToolCrossLinkDef(activeTool);
  const isEl = lang === 'el';

  return (
    <div
      className={cn(
        'shrink-0 border-b border-white/5 bg-surface-secondary/30 px-3 py-2',
        className,
      )}
      data-testid={`workspace-crosslinks-${activeTool}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted shrink-0">
          {isEl ? def.groupEl : def.groupEn}
        </span>
        <span className="hidden sm:inline text-[9px] text-text-muted truncate max-w-[200px]" title={stepTitle}>
          {concept?.slice(0, 32)}
        </span>
        <span className="flex-1" />
        {def.readerAnchor && onOpenReader && activeTool !== 'reader' && (
          <button
            type="button"
            data-testid="crosslink-open-reader"
            onClick={onOpenReader}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-0.5 text-[10px] text-text-secondary hover:border-brand-400/40 hover:text-brand-200"
          >
            <BookOpen className="h-3 w-3" />
            {isEl ? 'Πηγή' : 'Source'}
          </button>
        )}
        {onAskAgent && (
          <button
            type="button"
            data-testid="crosslink-ask-agent"
            onClick={onAskAgent}
            className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 text-[10px] text-accent-cyan hover:bg-accent-cyan/15"
          >
            <Sparkles className="h-3 w-3" />
            Agent
          </button>
        )}
      </div>
      {def.related.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {def.related.map((link) => (
            <button
              key={link.tool}
              type="button"
              data-testid={`crosslink-jump-${link.tool}`}
              onClick={() => onJumpTool(link.tool)}
              className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-surface-card/80 px-2 py-0.5 text-[10px] text-text-secondary hover:border-brand-500/30 hover:text-brand-200 transition-colors"
            >
              {isEl ? link.labelEl : link.labelEn}
              <ArrowRight className="h-2.5 w-2.5 opacity-50" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-[9px] text-text-muted line-clamp-1" title={isEl ? def.purposeEl : def.purposeEn}>
        {isEl ? def.purposeEl : def.purposeEn}
      </p>
    </div>
  );
}

export function crossLinkAgentPrompt(tool: WorkspaceToolId, lang: 'en' | 'el', concept?: string): string {
  return buildToolDefaultAgentPrompt(tool, lang, concept);
}

export { workspaceToolLabel };
