import { cn } from '../../utils/cn';
import type { WorkspacePedagogyLens } from '../../lib/workspacePedagogyLens';
import type { Lang } from '../../lib/i18n';

type Props = {
  lens: WorkspacePedagogyLens;
  onChange: (lens: WorkspacePedagogyLens) => void;
  lang: Lang;
  className?: string;
};

const OPTIONS: { id: WorkspacePedagogyLens; en: string; el: string }[] = [
  { id: 'theory', en: 'Theory', el: 'Θεωρία' },
  { id: 'balanced', en: 'Balanced', el: 'Ισορροπία' },
  { id: 'practice', en: 'Practice', el: 'Πράξη' },
];

export function TheoryPracticeLensToggle({ lens, onChange, lang, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border-subtle bg-surface-card/80 p-0.5',
        className,
      )}
      data-testid="workspace-theory-practice-lens"
      data-tour="workspace-theory-practice-lens"
      role="group"
      aria-label={lang === 'el' ? 'Φακός θεωρίας / πράξης' : 'Theory / practice lens'}
    >
      {OPTIONS.map((opt) => {
        const active = lens === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            data-testid={`workspace-lens-${opt.id}`}
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
            )}
            aria-pressed={active}
          >
            {lang === 'el' ? opt.el : opt.en}
          </button>
        );
      })}
    </div>
  );
}
