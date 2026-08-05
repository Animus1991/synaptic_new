import { GraduationCap, BookOpen, Target } from '@/lib/lucide-shim';
import { useI18n, type I18nKey } from '../lib/i18n';
import { cn } from '../utils/cn';

const CHIPS: { key: I18nKey; icon: typeof GraduationCap }[] = [
  { key: 'landingIntentExam', icon: GraduationCap },
  { key: 'landingIntentDeepRead', icon: BookOpen },
  { key: 'landingIntentPractice', icon: Target },
];

/** Decorative learning-intent chips — secondary to hero CTAs (Wave H1). */
export function LandingIntentChips({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div
      className={cn('landing-intent-chips flex flex-wrap gap-2', className)}
      data-testid="landing-intent-chips"
      aria-hidden
    >
      {CHIPS.map(({ key, icon: Icon }) => (
        <span key={key} className="landing-intent-chip landing-intent-chip--inline">
          <Icon className="landing-intent-chip-icon" aria-hidden />
          <span>{t(key)}</span>
        </span>
      ))}
    </div>
  );
}
