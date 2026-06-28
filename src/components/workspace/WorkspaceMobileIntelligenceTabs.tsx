import { cn } from '../../utils/cn';
import { t, type Lang } from '../../lib/i18n';

export type MobileIntelTab = 'discover' | 'concept-bus' | 'weak-areas';

type TabDef = { id: MobileIntelTab; labelEn: string; labelEl: string };

const TABS: TabDef[] = [
  { id: 'discover', labelEn: 'Tips', labelEl: 'Συμβουλές' },
  { id: 'concept-bus', labelEn: 'Concepts', labelEl: 'Έννοιες' },
  { id: 'weak-areas', labelEn: 'Weak spots', labelEl: 'Αδύναμα' },
];

export function intelPanelId(tab: MobileIntelTab): string {
  return `workspace-intel-panel-${tab}`;
}

type Props = {
  /** null = tab bar only, no panel body expanded */
  active: MobileIntelTab | null;
  onChange: (tab: MobileIntelTab) => void;
  lang?: Lang;
  badges?: Partial<Record<MobileIntelTab, number>>;
};

export function WorkspaceMobileIntelligenceTabs({ active, onChange, lang = 'en', badges }: Props) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto px-2 py-2 border-b border-white/5 hide-scrollbar snap-x snap-mandatory"
      data-testid="workspace-mobile-intel-tabs"
      role="tablist"
      aria-label={t('workspaceIntelAria', lang)}
    >
      {TABS.map((tab) => {
        const label = lang === 'el' ? tab.labelEl : tab.labelEn;
        const count = badges?.[tab.id];
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={intelPanelId(tab.id)}
            id={`workspace-intel-tab-${tab.id}`}
            data-testid={`workspace-mobile-intel-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'shrink-0 snap-start rounded-full border px-3 py-2 min-h-11 text-[11px] font-medium transition-colors touch-manipulation',
              selected
                ? 'border-brand-500/40 bg-brand-600/20 text-brand-200'
                : 'border-white/10 bg-surface-card text-text-secondary hover:text-text-primary active:bg-surface-hover',
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className="ml-1 rounded-full bg-accent-rose/20 px-1.5 py-0.5 text-[9px] text-accent-rose">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
