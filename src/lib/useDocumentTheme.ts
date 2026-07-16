import { useEffect, useState } from 'react';

function isLightThemeAttr(theme: string | null): boolean {
  return theme === 'light' || theme === 'spectrum' || theme === 'warm-sand';
}

/** True when document root theme resolves to a light surface (light or spectrum). */
export function useDocumentThemeIsLight(): boolean {
  const [isLight, setIsLight] = useState(() => {
    if (typeof document === 'undefined') return false;
    return isLightThemeAttr(document.documentElement.getAttribute('data-theme'));
  });

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setIsLight(isLightThemeAttr(root.getAttribute('data-theme')));
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return isLight;
}

/** Page-scoped Warm Sand cream (mockup) when the root theme is light-family. */
export function warmSandScopeProps(isLight: boolean): { 'data-theme': 'warm-sand' } | Record<string, never> {
  return isLight ? { 'data-theme': 'warm-sand' as const } : {};
}
