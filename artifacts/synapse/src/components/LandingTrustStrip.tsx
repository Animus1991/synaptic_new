import { useI18n, type I18nKey } from '../lib/i18n';
import { cn } from '../utils/cn';
import { AllCapsLabel } from './ui/AllCapsLabel';

const INSTITUTIONS: I18nKey[] = [
  'landingTrustUni',
  'landingTrustBootcamps',
  'landingTrustGroups',
  'landingTrustSelf',
];

/** Decorative grayscale trust strip — Replit logo row (Wave R6). */
export function LandingTrustStrip({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={cn('landing-trust-strip', className)} data-testid="landing-trust-strip">
      <p className="ux-semi-mono-eyebrow landing-trust-strip-eyebrow"><AllCapsLabel>{t('landingTrustStripEyebrow')}</AllCapsLabel></p>
      <div className="landing-trust-strip-logos" aria-hidden>
        {INSTITUTIONS.map((key) => (
          <span key={key} className="landing-trust-strip-logo">
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
}
