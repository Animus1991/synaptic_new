import { useI18n } from '../lib/i18n';
import { privacyPolicyUrl, supportEmail, termsOfServiceUrl } from '../lib/siteConfig';

type LandingFooterProps = {
  tagline: string;
};

/** Legal/footer contract — only real configured URLs (OPS-05 / B1). */
export function LandingFooter({ tagline }: LandingFooterProps) {
  const { t } = useI18n();
  const support = supportEmail();

  return (
    <footer
      data-testid="landing-footer"
      className="w-full py-12 border-t border-border-subtle"
      role="contentinfo"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-brand-500" aria-hidden />
          <span className="landing-display text-sm tracking-tight text-text-secondary">
            Synapse<span className="text-brand-500">.</span>
          </span>
        </div>

        <nav
          aria-label={t('landingFooterLegalNav')}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
        >
          <a
            href={privacyPolicyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="landing-privacy-link"
            className="text-text-secondary hover:text-brand-700 underline-offset-2 hover:underline transition-colors"
          >
            {t('landingFooterPrivacy')}
          </a>
          <a
            href={termsOfServiceUrl()}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="landing-terms-link"
            className="text-text-secondary hover:text-brand-700 underline-offset-2 hover:underline transition-colors"
          >
            {t('landingFooterTerms')}
          </a>
          <a
            href={`mailto:${support}`}
            data-testid="landing-contact-link"
            className="text-text-secondary hover:text-brand-700 underline-offset-2 hover:underline transition-colors"
          >
            {t('landingFooterContact')}
          </a>
        </nav>
      </div>

      <p className="text-xs text-text-muted mt-6" style={{ fontFamily: 'var(--font-mono)' }}>
        {tagline}
      </p>
    </footer>
  );
}
