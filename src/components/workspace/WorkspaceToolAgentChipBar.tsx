import { Sparkles } from '@/lib/lucide-shim';
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

/** Persistent Agent chip row for tools with dedicated coaching flows (XTL-02). */
export function WorkspaceToolAgentChipBar({ tool, lang, concept, onChip, className }: Props) {
  const { t } = useI18n();
  const chips = getToolAgentChips(tool);
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 px-3 py-2 sm:px-4',
        className,
      )}
      data-testid={`workspace-agent-chips-${tool}`}
      aria-label={t('toolAgentChipsAria')}
    >
      <span className="ws-eyebrow shrink-0 text-text-muted">{t('toolAgentChipsLabel')}</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          data-testid={`workspace-agent-chip-${tool}-${chip.id}`}
          onClick={() => onChip(chip.buildPrompt(concept, lang), chip.intent)}
          className="ux-agent-chip gap-1 px-2.5 py-1 text-[10px] font-medium min-h-[28px] border-accent-cyan/30 bg-accent-cyan/10 text-brand-800 hover:opacity-90"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          {t(chip.labelKey)}
        </button>
      ))}
    </div>
  );
}
