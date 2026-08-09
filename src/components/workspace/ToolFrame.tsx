import type { ReactNode } from 'react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WorkspaceToolHeader } from './WorkspaceToolHeader';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { useI18n } from '../../lib/i18n';

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

/**
 * Uniform tool chrome — single header surface + optional cross-link footer (Phase B8).
 * OPT-K142 — CTA-only border diet + tight type rhythm for all Studio panels.
 */
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
  const { t } = useI18n();
  return (
    <BlueprintSurface
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-0 shadow-none"
      data-testid="workspace-tool-frame"
      data-tool={activeTool}
      data-border-diet="cta-only"
    >
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
        <CollapsibleChromeSection
          title={t('chromeAgentLinks')}
          alwaysCollapse
          data-testid="workspace-tool-frame-crosslink"
        >
          <div className="shrink-0 border-b border-transparent">
            {crossLinkBar}
          </div>
        </CollapsibleChromeSection>
      )}
      <div className="ws-tool-body relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </BlueprintSurface>
  );
}
