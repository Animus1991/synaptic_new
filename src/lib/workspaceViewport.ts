/**
 * OPT-K67 — classic workspace phone chrome only below this width.
 * Aligns with notebook OPT-N1 phone tier (`< 768`); tablets get desktop chrome.
 */
export const WORKSPACE_PHONE_MAX_WIDTH = 768;

export function isWorkspacePhoneWidth(width: number): boolean {
  return width < WORKSPACE_PHONE_MAX_WIDTH;
}
