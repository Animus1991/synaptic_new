/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import { loadFocusStudy, persistFocusStudy } from './focusStudy';

describe('focusStudy (OPT-K105)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults to false and persists toggles', () => {
    expect(loadFocusStudy()).toBe(false);
    persistFocusStudy(true);
    expect(loadFocusStudy()).toBe(true);
    persistFocusStudy(false);
    expect(loadFocusStudy()).toBe(false);
  });
});
