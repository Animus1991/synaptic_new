import { MapPin } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';

interface Props {
  onClick: () => void;
  label?: string;
  className?: string;
  lang?: 'en' | 'el';
}

/* OPT-K101 β€” residual markup debt: decorative brand type -> ink */
export function GoToSourceButton({ onClick, label, className }: Props) {
  const { t } = useI18n();
  const text = label ?? t('goToSource');
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 type-micro font-medium',
        'text-text-secondary hover:text-text-primary hover:bg-brand-500/10 transition-colors',
        className,
      )}
    >
      <MapPin className="w-3 h-3 shrink-0" />
      {text}
    </button>
  );
}
