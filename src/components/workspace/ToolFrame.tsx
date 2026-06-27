import type { ReactNode } from 'react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WorkspaceToolHeader } from './WorkspaceToolHeader';

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
    <div className="flex h-full min-h-0 flex-col" data-testid="workspace-tool-frame" data-tool={activeTool}>
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
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
