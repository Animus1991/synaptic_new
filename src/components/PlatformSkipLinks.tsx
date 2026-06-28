import { useI18n } from '../lib/i18n';

/**
 * Platform-level skip links — first focusable targets in the Shell.
 * Desktop: main + sidebar nav. Mobile: main + bottom nav.
 */
export function PlatformSkipLinks() {
  const { t } = useI18n();

  return (
    <nav className="skip-links" aria-label={t('skipLinksAria')}>
      <a
        href="#platform-main"
        className="skip-to-content"
        data-testid="platform-skip-main"
      >
        {t('platformSkipToMain')}
      </a>
      <a
        href="#platform-sidebar-nav"
        className="skip-to-content max-lg:hidden"
        data-testid="platform-skip-nav-desktop"
      >
        {t('platformSkipToNav')}
      </a>
      <a
        href="#platform-mobile-nav"
        className="skip-to-content lg:hidden"
        data-testid="platform-skip-nav-mobile"
      >
        {t('platformSkipToNav')}
      </a>
    </nav>
  );
}
