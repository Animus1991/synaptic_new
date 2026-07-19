/**
 * Chrome density (OPT-M plan §5) — Comfortable / Compact like GitHub.
 * Applied as documentElement[data-density] alongside data-theme.
 */
import { loadJson, saveJson } from './persistence';

export type ChromeDensity = 'comfortable' | 'compact';

export const DEFAULT_CHROME_DENSITY: ChromeDensity = 'comfortable';
const DENSITY_KEY = 'chrome-density';

export function applyChromeDensity(density: ChromeDensity = DEFAULT_CHROME_DENSITY): ChromeDensity {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-density', density);
  }
  saveJson(DENSITY_KEY, density);
  return density;
}

export function loadChromeDensity(): ChromeDensity {
  const stored = loadJson<ChromeDensity | null>(DENSITY_KEY, null);
  if (stored === 'comfortable' || stored === 'compact') return stored;
  return DEFAULT_CHROME_DENSITY;
}

export function resolveChromeDensity(
  preference: ChromeDensity | undefined,
  language?: 'en' | 'el',
): ChromeDensity {
  if (preference === 'comfortable' || preference === 'compact') return preference;
  // Greek UI gets comfortable by default when unset (longer labels).
  if (language === 'el') return 'comfortable';
  return DEFAULT_CHROME_DENSITY;
}
