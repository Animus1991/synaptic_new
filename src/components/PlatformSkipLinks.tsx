import { useI18n } from '../lib/i18n';

/**
 * Platform-level skip link — jumps keyboard users past chrome to main content.
 * Hidden until Tab focus (standard a11y pattern); no floating nav skip (redundant).
 */
export function PlatformSkipLinks() {
  const { t } = useI18n();

  return (
    <a
      href="#platform-main"
      className="skip-to-content"
      data-testid="platform-skip-main"
    >
      {t('platformSkipToMain')}
    </a>
  );
}
