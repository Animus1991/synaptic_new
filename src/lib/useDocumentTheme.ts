import { useEffect, useState } from 'react';

/** True when document root theme resolves to a light surface (light or spectrum). */
export function useDocumentThemeIsLight(): boolean {
  const [isLight, setIsLight] = useState(() => {
    if (typeof document === 'undefined') return false;
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'light' || theme === 'spectrum' || theme === 'warm-sand';
  });

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const theme = root.getAttribute('data-theme');
      setIsLight(theme === 'light' || theme === 'spectrum' || theme === 'warm-sand');
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return isLight;
}
