/**
 * X3 (Canon cross-pollination, docs/INDEX.md) — independent accessibility contrast boost,
 * orthogonal to theme choice. Applied as documentElement[data-a11y-boost] alongside data-theme,
 * mirroring the chrome-density pattern in chromeDensity.ts.
 */
import { loadJson, saveJson } from './persistence';

const A11Y_BOOST_KEY = 'a11y-contrast-boost';

export function applyA11yBoost(enabled: boolean): boolean {
  if (typeof document !== 'undefined') {
    if (enabled) document.documentElement.setAttribute('data-a11y-boost', 'true');
    else document.documentElement.removeAttribute('data-a11y-boost');
  }
  saveJson(A11Y_BOOST_KEY, enabled);
  return enabled;
}

export function loadA11yBoost(): boolean {
  return loadJson<boolean>(A11Y_BOOST_KEY, false);
}
