import { Lightbulb } from 'lucide-react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { toolLearnerProblem, toolLaunchBlockers, getToolS20 } from '../../lib/workspaceToolS20Spine';

type Props = {
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
};

export function WorkspaceToolPurposeHint({ activeTool, lang }: Props) {
  const record = getToolS20(activeTool);
  const isEl = lang === 'el';
  const blockers = toolLaunchBlockers(activeTool);

  return (
    <div
      className="flex shrink-0 items-start gap-2 border-b border-border-subtle bg-surface-card/60 px-3 py-1.5"
      data-testid="workspace-tool-purpose-hint"
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" aria-hidden />
      <p className="min-w-0 text-[10px] leading-snug text-text-secondary">
        <span className="font-medium text-text-primary">
          {isEl ? 'Γιατί τώρα:' : 'Why now:'}
        </span>{' '}
        {toolLearnerProblem(activeTool, lang)}
        {blockers.length > 0 && record.readiness === 'needs-polish' && (
          <span className="ml-1 text-text-muted">
            ({isEl ? 'βελτιώνεται' : 'polish in progress'})
          </span>
        )}
      </p>
    </div>
  );
}
