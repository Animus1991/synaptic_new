import { useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { buildWorkspaceEmptyView, type WorkspaceEmptyTool } from '../../lib/workspaceEmptyState';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

type Props = {
  tool: WorkspaceEmptyTool;
  hasSource: boolean;
  concept?: string;
  /** Parent `toolEmptyMessage` override; defaults to §2.7 tool copy. */
  message?: string;
  /** Legacy upload when no provider context (no-source only). */
  onUpload?: () => void;
  compact?: boolean;
};

/** §2.7 — tool-scoped empty state with learning-outcome title and context CTAs. */
export function WorkspaceToolEmptyState({
  tool,
  hasSource,
  concept,
  message,
  onUpload,
  compact,
}: Props) {
  const { lang } = useI18n();
  const view = useMemo(
    () => buildWorkspaceEmptyView({ tool, hasSource, lang, concept }),
    [tool, hasSource, lang, concept],
  );

  return (
    <WorkspaceEmptyState
      tool={tool}
      title={view.title}
      message={message ?? view.message}
      hasSource={hasSource}
      onUpload={hasSource ? undefined : onUpload}
      compact={compact}
    />
  );
}
