import { useEffect, useState } from 'react';

function readRootTheme(): string | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute('data-theme');
}

export function isLightFamilyTheme(theme: string | null): boolean {
  return theme === 'light' || theme === 'spectrum' || theme === 'warm-sand';
}

/** Pure: cream nest only for root light (never spectrum). */
export function shouldApplyWarmSandPageScope(themeId: string | null): boolean {
  return themeId === 'light';
}

/** Pure: sepia heatmap for light / warm-sand only. */
export function shouldUseSepiaHeatmap(themeId: string | null): boolean {
  return themeId === 'light' || themeId === 'warm-sand';
}

/** Root `data-theme` id (reacts to theme toggle). */
export function useDocumentThemeId(): string | null {
  const [themeId, setThemeId] = useState<string | null>(() => readRootTheme());

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setThemeId(root.getAttribute('data-theme'));
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return themeId;
}

/** True when document root theme resolves to a light surface (light, spectrum, or warm-sand). */
export function useDocumentThemeIsLight(): boolean {
  return isLightFamilyTheme(useDocumentThemeId());
}

/**
 * Cream page nest for mockup fidelity.
 * Wave K-T01: only when root is `light` — never override spectrum identity.
 */
export function useWarmSandPageScope(): boolean {
  return shouldApplyWarmSandPageScope(useDocumentThemeId());
}

/** Sepia heatmap ramp (mockup) — light / warm-sand only, not spectrum. */
export function useSepiaHeatmap(): boolean {
  return shouldUseSepiaHeatmap(useDocumentThemeId());
}

/** Page-scoped Warm Sand cream when `useWarmSandPageScope()` is true. */
export function warmSandScopeProps(enable: boolean): { 'data-theme': 'warm-sand' } | Record<string, never> {
  return enable ? { 'data-theme': 'warm-sand' as const } : {};
}
