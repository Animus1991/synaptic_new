import { Lightbulb } from '@/lib/lucide-shim';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { toolLearnerProblem, toolLaunchBlockers, getToolS20 } from '../../lib/workspaceToolS20Spine';
import { useI18n } from '../../lib/i18n';

type Props = {
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
};

export function WorkspaceToolPurposeHint({ activeTool, lang }: Props) {
  const record = getToolS20(activeTool);
  const { t } = useI18n();
  const blockers = toolLaunchBlockers(activeTool);

  return (
    <div
      className="flex shrink-0 items-start gap-2 border-b border-border-subtle bg-surface-card/60 px-3 py-1.5"
      data-testid="workspace-tool-purpose-hint"
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" aria-hidden />
      <p className="min-w-0 text-[10px] leading-snug text-text-secondary">
        <span className="font-medium text-text-primary">
          {t('whyNowColon')}
        </span>{' '}
        {toolLearnerProblem(activeTool, lang)}
        {blockers.length > 0 && record.readiness === 'needs-polish' && (
          <span className="ml-1 text-text-muted">
            ({t('toolPolishing')})
          </span>
        )}
      </p>
    </div>
  );
}
