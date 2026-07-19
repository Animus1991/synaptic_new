/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  applyChromeDensity,
  loadChromeDensity,
  resolveChromeDensity,
  DEFAULT_CHROME_DENSITY,
} from './chromeDensity';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  });
}

describe('chromeDensity', () => {
  beforeEach(() => {
    installLocalStorageMock();
    document.documentElement.removeAttribute('data-density');
  });

  it('applies data-density on documentElement', () => {
    expect(applyChromeDensity('compact')).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(loadChromeDensity()).toBe('compact');
  });

  it('defaults Greek to comfortable when unset', () => {
    expect(resolveChromeDensity(undefined, 'el')).toBe('comfortable');
    expect(resolveChromeDensity(undefined, 'en')).toBe(DEFAULT_CHROME_DENSITY);
    expect(resolveChromeDensity('compact', 'el')).toBe('compact');
  });
});
