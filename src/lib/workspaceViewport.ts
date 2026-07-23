/**
 * OPT-K67 — classic workspace phone chrome only below this width.
 * Aligns with notebook OPT-N1 phone tier (`< 768`); tablets get desktop chrome.
 */
export const WORKSPACE_PHONE_MAX_WIDTH = 768;

/** Shell `#platform-mobile-nav` uses Tailwind `lg:hidden` (1024px). */
export const SHELL_MOBILE_NAV_MAX_WIDTH = 1024;

export function isWorkspacePhoneWidth(width: number): boolean {
  return width < WORKSPACE_PHONE_MAX_WIDTH;
}

/** True while the fixed bottom shell nav is visible (phone + tablet < lg). */
export function isShellMobileNavWidth(width: number): boolean {
  return width < SHELL_MOBILE_NAV_MAX_WIDTH;
}
