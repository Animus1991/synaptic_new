import type { WorkspaceToolId } from '../../lib/taskFlows';
import type { ToolAgentIntent } from '../../lib/workspaceToolAgentPrompts';
import { getToolAgentChips } from '../../lib/workspaceToolAgentChips';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  tool: WorkspaceToolId;
  lang: 'en' | 'el';
  concept: string;
  onChip: (prompt: string, intent: ToolAgentIntent) => void;
  className?: string;
};

/**
 * Persistent Agent chip row for tools with dedicated coaching flows (XTL-02).
 * OPT-K101 ink · OPT-K158 — text-first wash chips (no decorative icons / ALL-CAPS eyebrow).
 */
export function WorkspaceToolAgentChipBar({ tool, lang, concept, onChip, className }: Props) {
  const { t } = useI18n();
  const chips = getToolAgentChips(tool);
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 px-3 py-1.5 sm:px-4',
        className,
      )}
      data-testid={`workspace-agent-chips-${tool}`}
      data-clarity-pass="k158"
      aria-label={t('toolAgentChipsAria')}
    >
      <span className="shrink-0 type-caption text-text-muted">{t('toolAgentChipsLabel')}</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          data-testid={`workspace-agent-chip-${tool}-${chip.id}`}
          onClick={() => onChip(chip.buildPrompt(concept, lang), chip.intent)}
          className="ux-agent-chip min-h-8 border-0 bg-surface-secondary/55 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          {t(chip.labelKey)}
        </button>
      ))}
    </div>
  );
}
