import type { ReactNode } from 'react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WorkspaceToolHeader } from './WorkspaceToolHeader';
import { BlueprintSurface } from '../ui/BlueprintSurface';

type Props = {
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  concept?: string;
  hasSource?: boolean;
  sourceName?: string;
  onJumpTool?: (tool: WorkspaceToolId) => void;
  onOpenReader?: () => void;
  onAskAgent?: () => void;
  /** Compact cross-link strip rendered once below the header. */
  crossLinkBar?: ReactNode;
  children: ReactNode;
};

/** Uniform tool chrome — single header surface + optional cross-link footer (Phase B8). */
export function ToolFrame({
  activeTool,
  lang,
  concept,
  hasSource = false,
  sourceName,
  onJumpTool,
  onOpenReader,
  onAskAgent,
  crossLinkBar,
  children,
}: Props) {
  return (
    <BlueprintSurface className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" data-testid="workspace-tool-frame" data-tool={activeTool}>
      <WorkspaceToolHeader
        activeTool={activeTool}
        lang={lang}
        concept={concept}
        hasSource={hasSource}
        sourceName={sourceName}
        onJumpTool={onJumpTool}
        onOpenReader={onOpenReader}
        onAskAgent={onAskAgent}
      />
      {crossLinkBar && (
        <div className="shrink-0 border-b border-border-subtle/60" data-testid="workspace-tool-frame-crosslink">
          {crossLinkBar}
        </div>
      )}
      <div className="ws-tool-body relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </BlueprintSurface>
  );
}
