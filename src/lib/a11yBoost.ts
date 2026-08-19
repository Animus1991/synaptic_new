/**
 * X3 (Canon cross-pollination, docs/INDEX.md) — independent accessibility contrast boost,
 * orthogonal to theme choice. Applied as documentElement[data-a11y-boost] alongside data-theme,
 * mirroring the chrome-density pattern in chromeDensity.ts.
 */
import { loadJson, saveJson } from './persistence';

const A11Y_BOOST_KEY = 'a11y-contrast-boost';

export function applyA11yBoost(enabled: boolean): boolean {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-a11y-boost', 'true');
      /* Wave I9 — also expose the Canon-standard opt-in attribute so shared
         high-contrast CSS/selectors match on both projects (additive alias). */
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-a11y-boost');
      root.removeAttribute('data-high-contrast');
    }
  }
  saveJson(A11Y_BOOST_KEY, enabled);
  return enabled;
}

export function loadA11yBoost(): boolean {
  return loadJson<boolean>(A11Y_BOOST_KEY, false);
}
