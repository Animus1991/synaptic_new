import { useEffect, useState } from 'react';
import {
  isShellMobileNavWidth,
  isWorkspacePhoneWidth,
  SHELL_MOBILE_NAV_MAX_WIDTH,
  WORKSPACE_PHONE_MAX_WIDTH,
} from './workspaceViewport';

export type ResponsiveSurfaceMode = 'split' | 'stack';

export type ResponsiveLayout = {
  /** Latest `window.innerWidth` (0 before mount / SSR). */
  width: number;
  /** Phone tier — cramped split panes should stack (`< 768`). */
  isPhone: boolean;
  /** Shell bottom nav visible (`< 1024` / Tailwind `lg`). */
  isShellMobileNav: boolean;
  /**
   * Prefer split-screen when there is room; stack / full-width on phone.
   * Same breakpoint as workspace classic layout (OPT-K67).
   */
  preferSplit: boolean;
  /** Alias for consumers (e.g. review / proposal panes). */
  surfaceMode: ResponsiveSurfaceMode;
};

function readLayout(width: number): ResponsiveLayout {
  const isPhone = isWorkspacePhoneWidth(width);
  const isShellMobileNav = isShellMobileNavWidth(width);
  const preferSplit = !isPhone;
  return {
    width,
    isPhone,
    isShellMobileNav,
    preferSplit,
    surfaceMode: preferSplit ? 'split' : 'stack',
  };
}

/**
 * Window-size layout helper for split vs full-width / stacked surfaces.
 * Aligns with `workspaceViewport` phone + shell-nav breakpoints.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>(() =>
    // SSR / no window: assume desktop so split is preferred (matches prior workspace init).
    typeof window !== 'undefined' ? readLayout(window.innerWidth) : readLayout(1280),
  );

  useEffect(() => {
    const sync = () => setLayout(readLayout(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return layout;
}

export {
  WORKSPACE_PHONE_MAX_WIDTH,
  SHELL_MOBILE_NAV_MAX_WIDTH,
  isWorkspacePhoneWidth,
  isShellMobileNavWidth,
};
