import { useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  buildWorkspaceEmptyView,
  type WorkspaceEmptyAction,
  type WorkspaceEmptyTool,
} from '../../lib/workspaceEmptyState';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

type Props = {
  tool: WorkspaceEmptyTool;
  hasSource: boolean;
  concept?: string;
  /** Parent `toolEmptyMessage` override; defaults to §2.7 tool copy. */
  message?: string;
  /** Legacy upload when no provider context (no-source only). */
  onUpload?: () => void;
  /** Legacy single secondary — merged after context CTAs when both exist. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Explicit actions override context (discover / weak-areas rails). */
  actions?: WorkspaceEmptyAction[];
  compact?: boolean;
};

/** §2.7 — tool-scoped empty state with learning-outcome title and context CTAs. */
export function WorkspaceToolEmptyState({
  tool,
  hasSource,
  concept,
  message,
  onUpload,
  secondaryLabel,
  onSecondary,
  actions,
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
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      actions={actions}
      compact={compact}
    />
  );
}
